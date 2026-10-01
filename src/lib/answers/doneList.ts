import type { Question } from "../questions/schema";

/**
 * The done list, as data: one ordered run of questions you have answered, newest
 * first, each marked with the verdict that question most recently earned.
 *
 * Two decisions live here rather than in a view, because both apps have to make
 * them the same way and neither is obvious from the markup.
 *
 * **One list, not two.** The web used to render every miss and then every
 * finished question in separate blocks. That reads as two lists that happen to
 * be on one screen, and it buries the misses under however many you have got
 * right. Interleaved in answer order, the top of the list is what you just did,
 * which is what a done list is for.
 *
 * **Capped, because it is a phone.** Fifty is a screenful and a bit; past that
 * it is a scroll nobody finishes and a render nobody wants. The web caps at the
 * same fifty so the two do not disagree about how many questions you have done.
 *
 * The verdict rule is the one the profile already used for misses: most recent
 * wins, so getting a question right later clears it out of the retry set. The
 * completed list is older than the attempt stream and can name questions the
 * stream has since rolled off, so it is appended behind it rather than merged
 * by guessing at dates.
 */

/** Questions shown, both apps. */
export const DONE_LIMIT = 50;

export type DoneEntry = {
  id: string;
  /** The verdict that question most recently earned. */
  correct: boolean;
};

export type DoneListRow = DoneEntry & {
  question: Question;
};

export function buildDoneList(opts: {
  /** Ids answered correctly at some point, in the order they were added. */
  completedIds: readonly string[];
  /** Recent attempts in *record* order, oldest first. */
  attempts: readonly { id: string; correct: boolean }[];
  limit?: number;
}): DoneEntry[] {
  const { completedIds, attempts, limit = DONE_LIMIT } = opts;
  const seen = new Set<string>();
  const out: DoneEntry[] = [];

  // Newest first, and the first verdict for an id is the most recent one.
  for (let i = attempts.length - 1; i >= 0 && out.length < limit; i -= 1) {
    const attempt = attempts[i]!;
    if (seen.has(attempt.id)) continue;
    seen.add(attempt.id);
    out.push({ id: attempt.id, correct: attempt.correct });
  }

  // Anything the stream has rolled off but the done list still remembers, newest
  // first. These are only ever correct answers: that is what `completed` holds.
  for (let i = completedIds.length - 1; i >= 0 && out.length < limit; i -= 1) {
    const id = completedIds[i]!;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ id, correct: true });
  }

  return out;
}

/** Joins the ordered entries to the bank, dropping ids it cannot resolve. */
export function resolveDoneList(
  entries: readonly DoneEntry[],
  bank: readonly Question[],
): DoneListRow[] {
  const byId = new Map(bank.map((q) => [q.id, q]));
  const rows: DoneListRow[] = [];
  for (const entry of entries) {
    const question = byId.get(entry.id);
    if (question) rows.push({ ...entry, question });
  }
  return rows;
}
