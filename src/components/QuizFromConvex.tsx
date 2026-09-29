"use client";

import { useConvex } from "convex/react";
import { useCallback, useEffect, useState } from "react";

import { api } from "../../convex/_generated/api";
import type { Question } from "@/lib/questions/schema";
import { readProgress } from "@/lib/progress";
import { Quiz } from "./Quiz";

const PAGE = 20;

type DrawRow = {
  questionId: string;
  text: string;
  options: string[];
  answer: string;
  category: string;
  difficulty: number;
  explanation: string;
  source: Question["source"];
  tags: string[];
  addedAt: string;
};

function toQuestion(q: DrawRow): Question {
  return {
    id: q.questionId,
    text: q.text,
    options: [...q.options] as [string, string, string, string],
    answer: q.answer,
    category: q.category as Question["category"],
    tags: [...q.tags],
    difficulty: q.difficulty,
    explanation: q.explanation,
    source: q.source,
    answerAliases: [],
    status: "published" as const,
    addedAt: q.addedAt,
  };
}

/**
 * Plays from the published Convex questions table in pages (#25), not the
 * whole bank. First page excludes the local done list; top-ups exclude
 * everything seen so far. Page loads transfer O(1) questions regardless of
 * bank size.
 */
export function QuizFromConvex() {
  const client = useConvex();
  const [bank, setBank] = useState<Question[] | null>(null);
  const [initial, setInitial] = useState<Question | null>(null);

  useEffect(() => {
    let cancelled = false;
    void client
      .query(api.questions.draw, {
        excludeIds: [...readProgress().completed],
        count: PAGE,
      })
      .then((rows) => {
        if (cancelled) return;
        const questions = rows.map(toQuestion);
        setBank(questions);
        setInitial(
          questions[Math.floor(Math.random() * questions.length)] ?? null,
        );
      })
      .catch(() => {
        if (!cancelled) setBank([]);
      });
    return () => {
      cancelled = true;
    };
  }, [client]);

  const topUp = useCallback(
    async (seen: Set<string>): Promise<Question[]> => {
      const rows = await client.query(api.questions.draw, {
        excludeIds: [...seen].slice(-1000),
        count: PAGE,
      });
      const fresh = rows.map(toQuestion);
      setBank((prev) => {
        if (!prev) return fresh;
        const known = new Set(prev.map((q) => q.id));
        return [...prev, ...fresh.filter((q) => !known.has(q.id))];
      });
      return fresh;
    },
    [client],
  );

  if (bank === null || initial === null) return <LoadingSkeleton />;

  if (bank.length === 0) {
    const completed = readProgress().completed.length;
    return (
      <Shell>
        <main className="flex flex-1 flex-col pt-14">
          <p className="label text-muted">
            {completed > 0 ? "bank complete" : "empty bank"}
          </p>
          <h1 className="mt-3 font-display text-3xl">
            {completed > 0
              ? "Every question, answered right"
              : "Nothing published yet"}
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
            {completed > 0 ? (
              <a
                href="/profile"
                className="label cursor-pointer text-muted transition-colors hover:text-signal"
              >
                see your done list →
              </a>
            ) : (
              <>
                Run <span className="font-mono">npx convex dev</span> and then{" "}
                <span className="font-mono">npx tsx scripts/publish.mts</span> to sync
                the validated bank.
              </>
            )}
          </p>
        </main>
      </Shell>
    );
  }

  return <Quiz bank={bank} initial={initial} onNeedMore={topUp} />;
}

/** Same frame as Quiz (masthead + footer) so the swap-in doesn't jump. */
export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-5 pb-10">
      <header className="flex items-baseline justify-between border-b border-ink-line py-5">
        <span className="font-display text-2xl tracking-tight">
          <a href="/" aria-label="back to the game">
            Endless <span className="text-signal">AI</span>
          </a>
        </span>
        <span className="label text-muted">
          elo <span className="ml-1.5 font-mono text-sm text-paper">—</span>
        </span>
      </header>
      {children}
    </div>
  );
}

const LETTERS = ["A", "B", "C", "D"] as const;

/**
 * Skeleton of the question screen: label line, two headline bars, four
 * option rows. Bars shimmer with staggered delays; motion-safe so reduced
 * motion gets a static skeleton.
 */
function LoadingSkeleton() {
  return (
    <Shell>
      <main className="flex flex-1 flex-col pt-8" role="status" aria-busy="true">
        <span className="sr-only">Loading questions…</span>
        <div className="stagger pt-9" aria-hidden="true">
          <p className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 bg-signal motion-safe:animate-pulse" />
            <span className="label text-muted">fetching questions</span>
          </p>
          <div className="mt-5 flex flex-col gap-3">
            <span className="block h-9 w-full bg-paper/[0.07] motion-safe:animate-pulse" />
            <span
              className="block h-9 w-3/5 bg-paper/[0.07] motion-safe:animate-pulse"
              style={{ animationDelay: "0.15s" }}
            />
          </div>
        </div>

        <ul className="stagger mt-8 flex flex-col gap-2" aria-hidden="true">
          {LETTERS.map((letter, i) => (
            <li
              key={letter}
              className="flex w-full items-center gap-4 border border-ink-line px-4 py-3.5"
            >
              <span className="label mt-0.5 w-4 shrink-0 opacity-60">{letter}</span>
              <span
                className="block h-4 bg-paper/[0.07] motion-safe:animate-pulse"
                style={{
                  width: `${[78, 62, 71, 55][i]}%`,
                  animationDelay: `${0.1 + i * 0.12}s`,
                }}
              />
            </li>
          ))}
        </ul>
      </main>
    </Shell>
  );
}
