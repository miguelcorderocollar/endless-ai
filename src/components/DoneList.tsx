"use client";

import { sourceHref, sourceLabel } from "@/lib/questions/schema";
import type { Question } from "@/lib/questions/schema";
import { buildDoneList, resolveDoneList } from "@/lib/answers/doneList";

/**
 * Answered questions, newest first, each row carrying the verdict it most
 * recently earned: misses in red, finished ones in signal, both with a Learn
 * link.
 *
 * One list, not a misses block above a finished block, and capped at
 * `DONE_LIMIT`. Both decisions are `buildDoneList`'s, shared with the native
 * app; the reasons are written there. The short version: this is a phone-shaped
 * list of what you did most recently, not two inventories.
 */
export function DoneList({
  bank,
  completedIds,
  attempts,
  correct,
  answered,
  total,
}: {
  bank: Question[];
  completedIds: string[];
  /** Recent attempts in record order, oldest first. Server stream when signed in. */
  attempts: { id: string; correct: boolean }[];
  /** Correct count (server truth when signed in, device count otherwise). */
  correct: number;
  /** Answered count, same source as correct. */
  answered: number;
  /** Published bank size. */
  total: number;
}) {
  const rows = resolveDoneList(buildDoneList({ completedIds, attempts }), bank);

  return (
    <>
      <p className="mt-2 font-display text-7xl leading-none tracking-tight">
        {correct}
        <span className="text-3xl text-muted">/{answered}</span>
      </p>
      <p className="label mt-4 text-muted">
        answered correctly · {total} in the training set
      </p>

      {rows.length === 0 ? (
        <p className="mt-10 max-w-sm text-sm leading-relaxed text-muted">
          Nothing here yet. Answer a question right and it lands on this list —
          get one wrong and it shows up in red until you get it right.
        </p>
      ) : (
        <>
          {/* Just the heading. The old line carried a count, a "to retry"
              count and a "newest 50" note, which is three numbers about a list
              a player can see. The list itself is the information. */}
          <p className="label mt-10 text-muted">latest answers</p>
          <ul className="flex flex-col gap-5">
            {rows.map((row) => (
              <Row key={row.id} q={row.question} correct={row.correct} />
            ))}
          </ul>
        </>
      )}
    </>
  );
}

function LearnLink({ q }: { q: Question }) {
  const href = sourceHref(q.source);
  const label = sourceLabel(q.source);
  if (!href || !label) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="label group mt-2 inline-flex items-center gap-2 text-muted transition-colors hover:text-signal"
    >
      learn
      <span className="transition-transform group-hover:translate-x-0.5">
        →
      </span>
    </a>
  );
}

function Row({ q, correct }: { q: Question; correct: boolean }) {
  return (
    <li
      className={`border-t pt-4 [content-visibility:auto] [contain-intrinsic-size:auto_120px] ${
        correct ? "border-ink-line" : "border-fail/40"
      }`}
    >
      <p className="text-[0.95rem] leading-snug text-paper/90">{q.text}</p>
      <p className={`label mt-2 ${correct ? "text-signal" : "text-fail"}`}>
        {q.answer}
      </p>
      <LearnLink q={q} />
    </li>
  );
}
