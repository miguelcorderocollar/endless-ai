"use client";

import { useConvex, useConvexAuth, useQuery } from "convex/react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { api } from "../../convex/_generated/api";
import type { Question } from "@/lib/questions/schema";
import { readFilter } from "@/lib/quiz/filter";
import { readProgress } from "@/lib/progress";
import { Quiz } from "./Quiz";
import { QuizSkeleton, Shell } from "./Skeletons";

export { Shell };

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
 * whole bank. First page excludes the done list (local + server when signed
 * in, so an existing account never replays its history on a fresh device);
 * top-ups exclude everything seen so far. Page loads transfer O(1) questions
 * regardless of bank size.
 */
export function QuizFromConvex() {
  const client = useConvex();
  const { isAuthenticated } = useConvexAuth();
  const serverCompleted = useQuery(
    api.answers.myCompleted,
    isAuthenticated ? {} : "skip",
  );
  const [bank, setBank] = useState<Question[] | null>(null);
  const [initial, setInitial] = useState<Question | null>(null);
  const [filter] = useState<string[]>(() => readFilter());
  const categories = useMemo(
    () => new Set(filter as Question["category"][]),
    [filter],
  );

  useEffect(() => {
    if (isAuthenticated && serverCompleted === undefined) return;
    let cancelled = false;
    const excludeIds = [
      ...new Set([...readProgress().completed, ...(serverCompleted ?? [])]),
    ];
    void client
      .query(api.questions.draw, {
        excludeIds,
        count: PAGE,
        categories: filter,
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
  }, [client, isAuthenticated, serverCompleted, filter]);

  const topUp = useCallback(
    async (seen: Set<string>): Promise<Question[]> => {
      const excludeIds = [
        ...new Set([...(serverCompleted ?? []), ...seen]),
      ].slice(-1000);
      const rows = await client.query(api.questions.draw, {
        excludeIds,
        count: PAGE,
        categories: filter,
      });
      const fresh = rows.map(toQuestion);
      setBank((prev) => {
        if (!prev) return fresh;
        const known = new Set(prev.map((q) => q.id));
        return [...prev, ...fresh.filter((q) => !known.has(q.id))];
      });
      return fresh;
    },
    [client, serverCompleted, filter],
  );

  // The filter is fixed per page load: changing it reloads the game.

  if (bank === null || initial === null) return <QuizSkeleton />;

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

  return <Quiz bank={bank} initial={initial} onNeedMore={topUp} categories={categories} />;
}
