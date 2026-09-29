import type { ConvexReactClient } from "convex/react";

import {
  answer as answerRef,
  claimProgress as claimProgressRef,
  ensureProfile as ensureProfileRef,
  myCompleted as myCompletedRef,
  myStats as myStatsRef,
} from "./api";
import { getProgress, updateProgress } from "./progress";

/**
 * Account wiring for the native app, ported from the web's
 * `src/components/Account.tsx`. The server side already shipped in #2, so this
 * is the client half: claim on sign-in, send answers while signed in, and
 * reconcile to server truth.
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

/** Client-generated id, so a replayed answer is recognisable. */
export function newEventId(): string {
  // Not a UUID: no crypto dependency, and the only requirement is that it be
  // unique per answer. `crypto.randomUUID` is not available in Hermes.
  const rand = () => Math.floor(Math.random() * 0x100000000).toString(16);
  return `${Date.now().toString(16)}-${rand()}-${rand()}`;
}

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
 * Sends one answer and hands back the server's rating.
 *
 * `eventId` is always sent, including on the live path, and that is not
 * decoration: a mutation that fails is indistinguishable from one whose
 * response was lost, and only the exact-`eventId` dedupe tells them apart. The
 * web sends every signed-in answer through its outbox for the same reason.
 *
 * Returns null on failure. The caller has already moved the local rating
 * optimistically, so a failure here costs a sync, not the answer.
 */
export async function sendAnswer(
  client: ConvexReactClient,
  questionId: string,
  picked: string,
): Promise<{ rating: number } | null> {
  try {
    const result = await client.mutation(answerRef, {
      questionId,
      picked,
      eventId: newEventId(),
    });
    return { rating: result.ratingAfter };
  } catch {
    return null;
  }
}
