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

export const draw = makeFunctionReference<"query", DrawArgs, ConvexQuestionRow[]>(
  "questions:draw",
);

export const counts = makeFunctionReference<
  "query",
  Record<string, never>,
  { category: string; count: number }[]
>("questions:counts");
