"use client";

import { useMemo, useState } from "react";

import { sourceHref, sourceLabel } from "@/lib/questions/schema";
import type { Question } from "@/lib/questions/schema";

/** Initial page; "show more" adds another page. Keeps long lists cheap. */
const PAGE_SIZE = 25;

/** Answered questions with Learn links: misses in red, done in signal. */
export function DoneList({
  bank,
  completedIds,
  missedIds,
  correct,
  answered,
  total,
}: {
  bank: Question[];
  completedIds: string[];
  /** Most-recently-wrong ids (a later correct clears the miss). */
  missedIds: string[];
  /** Correct count (server truth when signed in, device count otherwise). */
  correct: number;
  /** Answered count, same source as correct. */
  answered: number;
  /** Published bank size. */
  total: number;
}) {
  const [visible, setVisible] = useState(PAGE_SIZE);

  const { done, missed } = useMemo(() => {
    const byId = new Map(bank.map((q) => [q.id, q]));
    const resolve = (ids: string[]) =>
      ids.flatMap((id) => {
        const q = byId.get(id);
        return q ? [q] : [];
      });
    return { done: resolve(completedIds), missed: resolve(missedIds) };
  }, [bank, completedIds, missedIds]);

  const shown = done.slice(0, visible);
  const remaining = done.length - shown.length;

  return (
    <>
      <p className="mt-2 font-display text-7xl leading-none tracking-tight">
        {correct}
        <span className="text-3xl text-muted">/{answered}</span>
      </p>
      <p className="label mt-4 text-muted">
        answered correctly · {total} in the training set
      </p>

      {done.length === 0 && missed.length === 0 ? (
        <p className="mt-10 max-w-sm text-sm leading-relaxed text-muted">
          Nothing here yet. Answer a question right and it lands on this list — get one
          wrong and it shows up below in red until you get it right.
        </p>
      ) : null}

      {missed.length > 0 ? (
        <div className="mt-10">
          <p className="label text-fail">
            missed · {missed.length} to retry
          </p>
          <ul className="flex flex-col gap-5">
            {missed.map((q) => (
              <MissedRow key={q.id} q={q} />
            ))}
          </ul>
        </div>
      ) : null}

      {done.length > 0 ? (
        <div className="mt-10">
          <p className="label text-muted">
            done · {done.length}
          </p>
          <ul className="flex flex-col gap-5">
            {shown.map((q) => (
              <DoneRow key={q.id} q={q} />
            ))}
          </ul>
          {remaining > 0 ? (
            <button
              type="button"
              onClick={() => setVisible((v) => v + PAGE_SIZE)}
              className="label mt-6 cursor-pointer text-muted transition-colors hover:text-signal"
            >
              show {Math.min(remaining, PAGE_SIZE)} more · {remaining} left
            </button>
          ) : null}
        </div>
      ) : null}
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
      <span className="transition-transform group-hover:translate-x-0.5">→</span>
    </a>
  );
}

function MissedRow({ q }: { q: Question }) {
  return (
    <li
      className="border-t border-fail/40 pt-4 [content-visibility:auto] [contain-intrinsic-size:auto_120px]"
    >
      <p className="text-[0.95rem] leading-snug text-paper/90">{q.text}</p>
      <p className="label mt-2 text-fail">{q.answer}</p>
      <LearnLink q={q} />
    </li>
  );
}

function DoneRow({ q }: { q: Question }) {
  return (
    <li
      className="border-t border-ink-line pt-4 [content-visibility:auto] [contain-intrinsic-size:auto_120px]"
    >
      <p className="text-[0.95rem] leading-snug text-paper/90">{q.text}</p>
      <p className="label mt-2 text-signal">{q.answer}</p>
      <LearnLink q={q} />
    </li>
  );
}
