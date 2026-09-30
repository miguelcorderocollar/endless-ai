import type { ConvexReactClient } from "convex/react";

import {
  answer as answerRef,
  claimProgress as claimProgressRef,
  ensureProfile as ensureProfileRef,
  myCompleted as myCompletedRef,
  myStats as myStatsRef,
  resetProgress as resetProgressRef,
  setDisplayName as setDisplayNameRef,
} from "./api";
import {
  clearProfileCache,
  readProfileCache,
  writeProfileCache,
} from "./profileCache";
import { getProgress, updateProgress } from "./progress";

/**
 * Account wiring for the native app, ported from the web's
 * `src/components/Account.tsx` and `src/app/profile/page.tsx`. The server side
 * already shipped in #2, so this is the client half: claim on sign-in, queue
 * answers while signed in, reconcile to server truth, and the two profile
 * mutations (rename, reset).
 *
 * The rule that matters, and it is the one people get wrong: **a brand-new
 * account is seeded from this device, an existing one overwrites it.**
 *
 *   - New account (no `userStats`): local rating/answered/correct become the
 *     server's. You keep everything you played as a guest.
 *   - Existing account (`seeded: false`): the server already has an Elo and a
 *     done list from other devices. Local totals are discarded and the device
 *     is reconciled to the server, otherwise signing in on a second phone would
 *     appear to wipe your history back to whatever that phone knew.
 *
 * Every step here is best-effort. If claim or reconcile fails the local rating
 * stands, because a guest who cannot reach the network must still be able to
 * play — the same reasoning the web applies.
 */

/**
 * Runs once per sign-in: make sure the profile row exists, then claim or
 * reconcile. Mirrors the web's one-shot effect, including the `claimed` guard
 * that stops a re-render from seeding twice.
 */
export async function syncOnSignIn(client: ConvexReactClient): Promise<void> {
  const local = getProgress();

  try {
    await client.mutation(ensureProfileRef, {});
  } catch {
    // A missing profile row is not fatal; claim will reject and we keep local.
  }

  try {
    const result = await client.mutation(claimProgressRef, {
      rating: local.rating,
      answered: local.answered,
      correct: local.correct,
    });
    if (result.seeded) return; // new account: server now mirrors the device

    // Existing account: the server is truth, so overwrite the device cache.
    const [stats, completed] = await Promise.all([
      client.query(myStatsRef, {}),
      client.query(myCompletedRef, {}),
    ]);
    if (stats) {
      updateProgress({
        ...getProgress(),
        rating: stats.rating,
        answered: stats.answered,
        correct: stats.correct,
        streak: stats.streak,
        completed,
      });
    } else {
      // No stats yet but an account exists: keep the local rating, take the
      // done list, which is the one thing that must come from the server.
      updateProgress({ ...getProgress(), completed });
    }
  } catch {
    /* best-effort: local progress stands */
  }
}

/**
 * Records the identity for the masthead and for the outbox's drain attribution.
 *
 * The handle, not the display name, is the identity: names are editable and not
 * unique, so an event tagged with one could be attributed to the wrong player.
 * Display names are non-unique and editable, so they are not identity here.
 */
export function rememberProfile(profile: {
  handle: string | null;
  displayName: string | null;
  role: string;
  isAnonymous: boolean;
}): void {
  writeProfileCache(profile);
}

/** On sign-out, so a guest never sees the previous account's name. */
export function forgetProfile(): void {
  clearProfileCache();
}

/** The handle of the last signed-in identity, for tagging a queued answer. */
export function currentHandle(): string | null {
  return readProfileCache()?.handle ?? null;
}

/** Renames yourself. Throws on an empty name; trims and caps at 40. */
export async function saveDisplayName(
  client: ConvexReactClient,
  displayName: string,
): Promise<void> {
  await client.mutation(setDisplayNameRef, { displayName });
  const cached = readProfileCache();
  if (cached) writeProfileCache({ ...cached, displayName: displayName.trim() });
}

/**
 * Wipes the account's history. Irreversible by design — the events and the
 * rollup are deleted, so the server drops back to a fresh 1000.
 *
 * Server only. The caller resets the device cache in the same breath (leaving
 * a local rating behind would show numbers the server no longer agrees with,
 * and the next claim would resurrect them), but that write belongs to the
 * screen that owns the confirmation, not to this transport call — doing it in
 * both places double-notifies every subscriber for no reason.
 */
export async function resetProgress(client: ConvexReactClient): Promise<void> {
  await client.mutation(resetProgressRef, {});
}
