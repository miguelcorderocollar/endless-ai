import { questionSchema, type Question } from "./schema";

/**
 * The one reader for a bundled bank file, shared by the web app's offline
 * fallback (`fallback.ts`, which fetches `public/bank.json`) and the native
 * app's baked-in bank (`apps/mobile/src/lib/localBank.ts`, which imports
 * `assets/bank.json`).
 *
 * Both sides therefore agree on what a bundle is and, more importantly, on how
 * a row is judged: a full `questionSchema` parse, not a shape check. A corrupt
 * row (wrong option count, answer outside the options, non-numeric difficulty)
 * would crash a question screen or poison the Elo math downstream, so it is
 * dropped and reported here, once, rather than in each app. The bank is
 * hundreds of questions; losing one broken row is invisible, which is why
 * skipping beats throwing.
 */

export type BankBundle = {
  version: string;
  count: number;
  questions: Question[];
};

export type BankFile = {
  version?: unknown;
  count?: unknown;
  questions?: unknown;
};

/**
 * The questions in a bundle that survive the schema, published only. Anything
 * that is not an array of rows yields an empty bank, so a truncated or
 * hand-mangled asset degrades to "no offline play" instead of a crash.
 */
export function parseBankFile(file: unknown): Question[] {
  const rows = (file as BankFile | null)?.questions;
  if (!Array.isArray(rows)) return [];
  const out: Question[] = [];
  for (const row of rows) {
    const parsed = questionSchema.safeParse(row);
    if (parsed.success && parsed.data.status === "published") {
      out.push(parsed.data);
    }
  }
  return out;
}
