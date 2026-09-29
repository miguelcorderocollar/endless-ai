"use client";

import { useMemo } from "react";

import { sourceHref, sourceLabel } from "@/lib/questions/schema";
import type { Question } from "@/lib/questions/schema";

/** Correctly answered questions with Learn links. */
export function DoneList({
  bank,
  completedIds,
  correct,
  answered,
  total,
}: {
  bank: Question[];
  completedIds: string[];
  /** Correct count (server truth when signed in, device count otherwise). */
  correct: number;
  /** Answered count, same source as correct. */
  answered: number;
  /** Published bank size. */
  total: number;
}) {
  const done = useMemo(() => {
    const byId = new Map(bank.map((q) => [q.id, q]));
    return completedIds.flatMap((id) => {
      const q = byId.get(id);
      return q ? [q] : [];
    });
  }, [bank, completedIds]);

  return (
    <>
      <p className="mt-2 font-display text-7xl leading-none tracking-tight">
        {correct}
        <span className="text-3xl text-muted">/{answered}</span>
      </p>
      <p className="label mt-4 text-muted">
        answered correctly · {total} in the training set
      </p>

      {done.length > 0 ? (
        <ul className="mt-10 flex flex-col gap-5">
          {done.map((q) => {
            const href = sourceHref(q.source);
            const label = sourceLabel(q.source);
            return (
              <li key={q.id} className="border-t border-ink-line pt-4">
                <p className="text-[0.95rem] leading-snug text-paper/90">{q.text}</p>
                <p className="label mt-2 text-signal">{q.answer}</p>
                {href && label ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="label group mt-2 inline-flex items-center gap-2 text-muted transition-colors hover:text-signal"
                  >
                    learn
                    <span className="transition-transform group-hover:translate-x-0.5">→</span>
                  </a>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-10 max-w-sm text-sm leading-relaxed text-muted">
          Nothing here yet. Answer a question right and it lands on this list — get one
          wrong and it comes back for another try.
        </p>
      )}
    </>
  );
}
