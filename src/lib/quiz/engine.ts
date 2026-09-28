import { type CategoryKey, type Question } from "@/lib/questions/schema";

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
 */
export function pickNext(
  bank: Question[],
  seen: Set<string>,
  categories: Set<CategoryKey>,
  random: () => number = Math.random,
): Question | null {
  const pool = bank.filter(
    (q) =>
      !seen.has(q.id) && (categories.size === 0 || categories.has(q.category)),
  );
  if (pool.length === 0) return null;
  return pool[Math.floor(random() * pool.length)] ?? null;
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
