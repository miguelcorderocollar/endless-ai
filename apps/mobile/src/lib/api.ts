import { makeFunctionReference } from "convex/server";

import type { ConvexQuestionRow } from "./bank";

/**
 * The two Convex functions this app calls, declared client-side.
 *
 * The web app imports the generated `api` from `convex/_generated`, whose types
 * pull in every backend module. That does not survive crossing into React
 * Native: Expo types `process.env` for a client, not a Node process, so the
 * backend's own `process.env.ADMIN_EMAILS` fails `noImplicitAny` under this
 * app's tsconfig. A native app should not be typechecking the server anyway.
 *
 * The trade is that these signatures can drift from the backend. Two things
 * limit the damage, and both matter more than the types do:
 *
 *  - Convex validates arguments server-side, so a wrong shape is a loud error
 *    on the call, not silent bad data.
 *  - `toQuestions` runs every returned row through the shared
 *    `questionSchema`, so a changed return shape is dropped and reported rather
 *    than rendered.
 *
 * `npm run typecheck` at the repo root still owns the backend. If these two
 * signatures ever need to change, that is the check that catches it.
 */
export type DrawArgs = {
  excludeIds: string[];
  count?: number;
  categories?: string[];
  ratingHint?: number;
};

export const draw = makeFunctionReference<
  "query",
  DrawArgs,
  ConvexQuestionRow[]
>("questions:draw");

export const counts = makeFunctionReference<
  "query",
  Record<string, never>,
  { category: string; count: number }[]
>("questions:counts");

/**
 * The whole published bank, for the profile's done list. The web reads this
 * instead of its own content files because the list has to reflect what is
 * actually published; the offline copy here is the fallback when it cannot be
 * reached, and the two agree by construction.
 */
export const list = makeFunctionReference<
  "query",
  Record<string, never>,
  ConvexQuestionRow[]
>("questions:list");

/*
 * Auth and account (#2, and the part of #18 that was missing). The server side
 * already shipped — Convex Auth with a Password provider and Anonymous — and
 * the native app talks to the same backend, so this is client wiring only.
 */

/** `null` for a guest, so a guest and a signed-out user are the same branch. */
export const me = makeFunctionReference<
  "query",
  Record<string, never>,
  {
    handle: string | null;
    displayName: string | null;
    role: "user" | "admin";
    isAnonymous: boolean;
  } | null
>("users:me");

export const ensureProfile = makeFunctionReference<
  "mutation",
  Record<string, never>,
  { ok: true }
>("users:ensureProfile");

/**
 * Seeds a brand-new account from this device's totals. Returns
 * `{ seeded: false }` for an account that already has stats, which is the
 * signal to discard local totals and show server truth instead.
 */
export const claimProgress = makeFunctionReference<
  "mutation",
  { rating: number; answered: number; correct: number },
  { seeded: boolean }
>("users:claimProgress");

/**
 * The one writer of server Elo (#3 + #4). `eventId` is the outbox's exact
 * replay key (#17): a mutation that succeeded but whose response was lost
 * returns the stored result instead of inserting twice.
 */
export const answer = makeFunctionReference<
  "mutation",
  { questionId: string; picked: string; eventId?: string },
  {
    correct: boolean;
    ratingBefore: number;
    ratingAfter: number;
    delta: number;
    deduped: boolean;
  }
>("answers:answer");

/** Materialized per-user rollup (#34), or null before the first answer. */
export const myStats = makeFunctionReference<
  "query",
  Record<string, never>,
  {
    rating: number;
    answered: number;
    correct: number;
    streak: number;
    bestStreak: number;
    byCategory: { category: string; answered: number; correct: number }[];
  } | null
>("answers:myStats");

export const myCompleted = makeFunctionReference<
  "query",
  Record<string, never>,
  string[]
>("answers:myCompleted");

/**
 * Recent verdicts, newest first, for the profile's misses list. The device-local
 * `recent` ring holds ids and is capped at 100 attempts; this is the cross-device
 * truth and the only way a later correct answer can clear an old miss.
 */
export const myRecent = makeFunctionReference<
  "query",
  { limit?: number },
  { questionId: string; correct: boolean; createdAt: number }[]
>("answers:myRecent");

/**
 * Builds the rollup for an account that has events but no `userStats` doc — an
 * account created before the rollup shipped. Idempotent, so calling it when a
 * row already exists is free.
 */
export const ensureStats = makeFunctionReference<
  "mutation",
  Record<string, never>,
  { created: boolean }
>("answers:ensureStats");

/**
 * Stats reads (#11). `history` is the caller's rating series for the Elo chart;
 * `population` is the whole field's, for the distribution and the percentile.
 * `population` is public on purpose — a percentile is only meaningful against
 * everyone, and the web's profile renders it for signed-out visitors too.
 */
export const history = makeFunctionReference<
  "query",
  Record<string, never>,
  { t: number; r: number }[]
>("stats:history");

export const population = makeFunctionReference<
  "query",
  Record<string, never>,
  {
    count: number;
    median: number | null;
    buckets: number[];
    percentile: number | null;
    capped: boolean;
  }
>("stats:population");

/** Rename yourself. Throws on an empty name; trims and caps at 40 server-side. */
export const setDisplayName = makeFunctionReference<
  "mutation",
  { displayName: string },
  { ok: true }
>("users:setDisplayName");

/**
 * Irreversible: deletes every answer event and the rollup, so Elo, streak,
 * per-category accuracy and the done list all go. The account, handle and role
 * stay. The web only offers this behind a "danger zone" confirmation, and so
 * does this — see the profile.
 */
export const resetProgress = makeFunctionReference<
  "mutation",
  Record<string, never>,
  { events: number; stats: number }
>("users:resetProgress");
