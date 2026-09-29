"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import {
  type SavedProgress,
  RECENT_CAP,
  getProgressServerSnapshot,
  getProgressSnapshot,
  hydrateProgress,
  readProgress,
  subscribeProgress,
  updateProgress,
} from "@/lib/progress";
import { pickNext } from "@/lib/quiz/engine";
import { scoreAnswer } from "@/lib/quiz/elo";
import { sourceHref, sourceLabel } from "@/lib/questions/schema";
import type { Question } from "@/lib/questions/schema";
import { useConvexAuth, useMutation } from "convex/react";

import { api } from "../../convex/_generated/api";

type Phase = "question" | "revealed";

const LETTERS = ["A", "B", "C", "D"] as const;

export function Quiz({
  bank,
  initial,
  onNeedMore,
  categories,
}: {
  bank: Question[];
  initial: Question;
  onNeedMore: (seen: Set<string>) => Promise<Question[]>;
  /** Fun-mode filter (#12): stream stays inside these, Elo untouched. */
  categories: Set<Question["category"]>;
}) {
  const progress = useSyncExternalStore(
    subscribeProgress,
    getProgressSnapshot,
    getProgressServerSnapshot,
  );
  const [phase, setPhase] = useState<Phase>("question");
  const [current, setCurrent] = useState<Question | null>(initial);
  const [picked, setPicked] = useState<string | null>(null);
  const [seen, setSeen] = useState<Set<string>>(() => new Set([initial.id]));
  const [exhausted, setExhausted] = useState(false);
  const { isAuthenticated } = useConvexAuth();
  const recordAnswer = useMutation(api.answers.answer);

  useEffect(() => {
    hydrateProgress();
  }, []);

  const nextQuestion = useCallback(() => {
    const next = pickNext(bank, seen, categories);
    if (!next) {
      // Current page exhausted: ask the server for more unseen questions.
      // Empty twice in a row means the bank is truly done.
      void onNeedMore(seen).then((fresh) => {
        const retry = pickNext([...bank, ...fresh], seen, categories);
        if (!retry) {
          setExhausted(true);
          return;
        }
        setSeen((prev) => new Set(prev).add(retry.id));
        setCurrent(retry);
        setPicked(null);
        setPhase("question");
      });
      return;
    }
    setSeen((prev) => new Set(prev).add(next.id));
    setCurrent(next);
    setPicked(null);
    setPhase("question");
  }, [bank, seen, onNeedMore, categories]);

  const answer = useCallback(
    (option: string) => {
      if (phase !== "question" || !current) return;
      const correct = option === current.answer;
      const { rating: nextRating } = scoreAnswer(progress.rating, current.difficulty, correct);

      setPicked(option);
      setPhase("revealed");

      updateProgress({
        ...progress,
        rating: nextRating,
        answered: progress.answered + 1,
        correct: progress.correct + (correct ? 1 : 0),
        completed:
          correct && !progress.completed.includes(current.id)
            ? [...progress.completed, current.id]
            : progress.completed,
        recent: [
          ...progress.recent,
          { id: current.id, correct, at: Date.now() },
        ].slice(-RECENT_CAP),
        lastPlayed: new Date().toISOString().slice(0, 10),
      });

      // Server is truth for Elo and owns the event log. Optimistic local
      // update above keeps feedback instant; reconcile to the server rating
      // when it lands. Guests without a session stay local-only.
      if (isAuthenticated) {
        const questionId = current.id;
        void recordAnswer({ questionId, picked: option }).then(
          (result) => {
            updateProgress({ ...readProgress(), rating: result.ratingAfter });
          },
          () => {
            /* offline or backend hiccup: the local update stands */
          },
        );
      }
    },
    [current, phase, progress, isAuthenticated, recordAnswer],
  );

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-5 pb-10">
      <Masthead progress={progress} />

      {exhausted ? (
        <main className="flex flex-1 flex-col pt-14">
          <p className="label text-muted">bank complete</p>
          <h1 className="mt-3 font-display text-3xl">Every question, answered right</h1>
          <Link
            href="/profile"
            className="label mt-8 w-fit cursor-pointer border border-signal bg-signal px-6 py-3 text-ink transition-colors hover:bg-paper hover:border-paper"
          >
            see your done list
          </Link>
        </main>
      ) : (
        <main className="flex flex-1 flex-col pt-8">
          {current ? (
            <>
              <div key={current.id} className="stagger pt-9">
                <h1 className="mt-3 font-display text-[1.75rem] leading-[1.25] text-balance sm:text-4xl">
                  {current.text}
                </h1>
              </div>

              <ul className="stagger mt-8 flex flex-col gap-2">
                {current.options.map((option, index) => {
                  const letter = LETTERS[index]!;
                  const isPicked = picked === option;
                  const isAnswer = option === current.answer;
                  const revealed = phase === "revealed";

                  let tone = "border-ink-line text-paper hover:border-paper/50 hover:bg-paper/[0.04]";
                  if (revealed && isAnswer) tone = "border-signal bg-signal text-ink";
                  else if (revealed && isPicked) tone = "border-fail bg-fail text-ink";
                  else if (revealed) tone = "border-ink-line text-muted";

                  return (
                    <li key={option}>
                      <button
                        type="button"
                        disabled={revealed}
                        onClick={() => answer(option)}
                        className={`group flex w-full items-start gap-4 border px-4 py-3.5 text-left transition-colors duration-150 ${tone} ${
                          revealed ? "cursor-default" : "cursor-pointer"
                        }`}
                      >
                        <span className="label mt-0.5 w-4 shrink-0 opacity-60">{letter}</span>
                        <span className="text-[0.95rem] leading-snug">{option}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              {phase === "revealed" ? (
                <Reveal
                  key={`reveal-${current.id}`}
                  question={current}
                  correct={picked === current.answer}
                  onNext={nextQuestion}
                />
              ) : null}
            </>
          ) : null}
        </main>
      )}
    </div>
  );
}

function Masthead({ progress }: { progress: SavedProgress }) {
  return (
    <header className="flex items-center justify-between border-b border-ink-line py-5">
      <span className="font-display text-2xl tracking-tight">
        <Link href="/" aria-label="back to the game">
          Endless <span className="text-signal">AI</span>
        </Link>
      </span>
      <div className="flex items-center gap-5">
        <span className="label text-muted">
          elo <span className="ml-1.5 font-mono text-sm text-paper">{progress.rating}</span>
        </span>
        <Link
          href="/categories"
          className="label cursor-pointer text-muted transition-colors hover:text-signal"
        >
          cats
        </Link>
        <Link
          href="/profile"
          aria-label="profile and settings"
          className="text-muted transition-colors hover:text-signal"
        >
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </Link>
      </div>
    </header>
  );
}

function Reveal({
  question,
  correct,
  onNext,
}: {
  question: Question;
  correct: boolean;
  onNext: () => void;
}) {
  const href = sourceHref(question.source);
  const label = sourceLabel(question.source);

  return (
    <div className="rise mt-7 border-t border-ink-line pt-5">
      <p className="label text-signal">{correct ? "correct" : "not quite"}</p>
      <p className="mt-3 text-[0.95rem] leading-relaxed text-paper/85">{question.explanation}</p>

      <div className="mt-5 flex flex-wrap items-center gap-5">
        <button
          type="button"
          onClick={onNext}
          className="label cursor-pointer border border-signal bg-signal px-5 py-2.5 text-ink transition-colors hover:bg-paper hover:border-paper"
        >
          next
        </button>

        {href && label ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="label group inline-flex items-center gap-2 text-muted transition-colors hover:text-signal"
          >
            learn
            <span className="transition-transform group-hover:translate-x-0.5">→</span>
          </a>
        ) : null}
      </div>
    </div>
  );
}
