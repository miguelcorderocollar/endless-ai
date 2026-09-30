import { type CategoryKey } from "../questions/schema";

/**
 * Per-category accuracy, the shared arithmetic behind the bars on the
 * categories screen.
 *
 * `answers.myStats` has carried `byCategory` since the rollup landed (#34), and
 * the web app drew a bar per row — but the arithmetic was inline in the page,
 * so the native app would have had to restate it to match. Here it is once.
 *
 * The `null` is load-bearing: a category you have never answered is not a zero,
 * it is unknown, and the two render differently (a dash against an empty bar).
 * Collapsing them would claim you are bad at something you have not tried.
 */

export type CategoryCount = { category: string; answered: number; correct: number };

export type CategoryAccuracy = {
  answered: number;
  correct: number;
  /** 0-100, or null when nothing has been answered in this category. */
  pct: number | null;
};

/** Keyed by category, so a screen can look up all fourteen in one pass. */
export function accuracyByCategory(
  rows: readonly CategoryCount[] | null | undefined,
): Map<CategoryKey, CategoryAccuracy> {
  const out = new Map<CategoryKey, CategoryAccuracy>();
  for (const row of rows ?? []) {
    out.set(row.category as CategoryKey, {
      answered: row.answered,
      correct: row.correct,
      pct: row.answered > 0 ? Math.round((row.correct / row.answered) * 100) : null,
    });
  }
  return out;
}
