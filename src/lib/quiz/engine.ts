import { type CategoryKey, type Question } from "../questions/schema";
import { difficultyRating } from "./elo";

export type AnswerRecord = {
  questionId: string;
  category: CategoryKey;
  difficulty: number;
  correct: boolean;
};

export type RunState = {
  rating: number;
  answered: Question[];
  records: AnswerRecord[];
  correct: number;
};

/**
 * Draws questions for an endless run. A question can only appear once per run, and the
 * order is shuffled so a player who restarts does not get the same stream. Categories
 * left empty means the whole bank.
 *
 * Elo-matched (#32): with a player rating, candidates are weighted by a Gaussian
 * over the distance between question rating and player rating, so newcomers mostly
 * see easy questions and experts mostly hard ones. A uniform exploration floor keeps
 * rare off-level questions surfacing (no filter bubble). Null rating = uniform,
 * the old behavior (guests with no history, tests).
 */
export function pickNext(
  bank: Question[],
  seen: Set<string>,
  categories: Set<CategoryKey>,
  random: () => number = Math.random,
  playerRating: number | null = null,
): Question | null {
  const pool = bank.filter(
    (q) =>
      !seen.has(q.id) && (categories.size === 0 || categories.has(q.category)),
  );
  if (pool.length === 0) return null;
  if (playerRating === null || random() < EXPLORATION) {
    return pool[Math.floor(random() * pool.length)] ?? null;
  }
  const weights = pool.map((q) => matchWeight(q.difficulty, playerRating));
  return weightedSample(pool, weights, 1, random)[0] ?? null;
}

export function emptyRun(startingRating: number): RunState {
  return { rating: startingRating, answered: [], records: [], correct: 0 };
}

export function accuracy(records: AnswerRecord[]): number {
  if (records.length === 0) return 0;
  const right = records.filter((r) => r.correct).length;
  return right / records.length;
}

export function categoryBreakdown(records: AnswerRecord[]) {
  const totals = new Map<CategoryKey, { correct: number; total: number }>();
  for (const record of records) {
    const entry = totals.get(record.category) ?? { correct: 0, total: 0 };
    entry.total += 1;
    if (record.correct) entry.correct += 1;
    totals.set(record.category, entry);
  }
  return [...totals.entries()]
    .map(([category, { correct, total }]) => ({ category, correct, total }))
    .sort((a, b) => a.correct / a.total - b.correct / b.total);
}

/**
 * Gaussian width for the Elo-matched draw (#32). σ ≈ 250: neighbors likely,
 * two bands away rare, extremes ~exploration only.
 */
export const MATCH_SIGMA = 250;

/** Share of draws that ignore rating (uniform), against filter bubbles. */
export const EXPLORATION = 0.15;

/** Gaussian weight of a question difficulty for a player rating. */
export function matchWeight(difficulty: number, playerRating: number): number {
  const d = difficultyRating(difficulty) - playerRating;
  return Math.exp(-(d * d) / (2 * MATCH_SIGMA * MATCH_SIGMA));
}

/**
 * Weighted sample without replacement. Pure (injectable random) so the client
 * draw and the server draw (#25) share it. Zero/negative total weight falls
 * back to uniform rather than returning nothing.
 */
export function weightedSample<T>(
  items: T[],
  weights: number[],
  count: number,
  random: () => number = Math.random,
): T[] {
  const remaining = items.map((_, i) => i);
  const w = items.map((_, i) => Math.max(0, weights[i] ?? 0));
  const out: T[] = [];
  while (out.length < Math.min(count, items.length) && remaining.length > 0) {
    const total = w.reduce((a, b) => a + b, 0);
    let at: number;
    if (total > 0) {
      let r = random() * total;
      at = remaining.length - 1;
      for (let i = 0; i < remaining.length; i++) {
        r -= w[i]!;
        if (r <= 0) {
          at = i;
          break;
        }
      }
    } else {
      at = Math.floor(random() * remaining.length);
    }
    out.push(items[remaining[at]!]!);
    remaining.splice(at, 1);
    w.splice(at, 1);
  }
  return out;
}
