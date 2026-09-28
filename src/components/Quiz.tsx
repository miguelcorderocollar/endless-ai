"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";

import {
  type SavedProgress,
  getProgressServerSnapshot,
  getProgressSnapshot,
  hydrateProgress,
  subscribeProgress,
  updateProgress,
} from "@/lib/progress";
import { accuracy, categoryBreakdown, pickNext } from "@/lib/quiz/engine";
import { scoreAnswer, tierFor } from "@/lib/quiz/elo";
import {
  type CategoryKey,
  categoryLabel,
  sourceHref,
  sourceLabel,
} from "@/lib/questions/schema";
import type { Question } from "@/lib/questions/schema";

type Phase = "question" | "revealed" | "finished";

type Answer = {
  questionId: string;
  category: CategoryKey;
  difficulty: number;
  correct: boolean;
  picked: string;
};

const LETTERS = ["A", "B", "C", "D"] as const;

export function Quiz({ bank, initial }: { bank: Question[]; initial: Question }) {
  const progress = useSyncExternalStore(
    subscribeProgress,
    getProgressSnapshot,
    getProgressServerSnapshot,
  );
  const [phase, setPhase] = useState<Phase>("question");
  const [current, setCurrent] = useState<Question | null>(initial);
  const [picked, setPicked] = useState<string | null>(null);
  const [seen, setSeen] = useState<Set<string>>(() => new Set([initial.id]));
  const [answers, setAnswers] = useState<Answer[]>([]);

  useEffect(() => {
    hydrateProgress();
  }, []);

  const nextQuestion = useCallback(() => {
    const next = pickNext(bank, seen, new Set<CategoryKey>());
    setSeen((prev) => new Set(prev).add(next?.id ?? ""));
    setCurrent(next);
    setPicked(null);
    setPhase(next ? "question" : "finished");
  }, [bank, seen]);

  const answer = useCallback(
    (option: string) => {
      if (phase !== "question" || !current) return;
      const correct = option === current.answer;
      const { rating: nextRating } = scoreAnswer(progress.rating, current.difficulty, correct);

      setPicked(option);
      setPhase("revealed");
      setAnswers((prev) => [
        ...prev,
        {
          questionId: current.id,
          category: current.category,
          difficulty: current.difficulty,
          correct,
          picked: option,
        },
      ]);

      const updated = {
        ...progress,
        rating: nextRating,
        answered: progress.answered + 1,
        correct: progress.correct + (correct ? 1 : 0),
        lastPlayed: new Date().toISOString().slice(0, 10),
      };
      updateProgress(updated);
    },
    [current, phase, progress],
  );

  const reset = useCallback(() => {
    const fresh = pickNext(bank, new Set(), new Set<CategoryKey>()) ?? initial;
    setSeen(new Set([fresh.id]));
    setAnswers([]);
    setPicked(null);
    setPhase("question");
    setCurrent(fresh);
  }, [bank, initial]);

  const correctCount = answers.filter((a) => a.correct).length;
  const endRun = useCallback(() => setPhase("finished"), []);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-5 pb-10">
      <Masthead progress={progress} onReset={reset} />

      {phase === "finished" ? (
        <Summary
          answers={answers}
          correct={correctCount}
          rating={progress.rating}
          bankSize={bank.length}
          seen={seen.size}
          bankTotal={bank.length}
          onRestart={reset}
        />
      ) : (
        <main className="flex flex-1 flex-col pt-8">
          {current ? (
            <>
              <div key={current.id} className="stagger pt-9">
                <p className="label text-muted">
                  {categoryLabel(current.category)} · difficulty {current.difficulty}
                </p>
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
              ) : (
                <div className="mt-8 flex items-center justify-between">
                  <p className="label text-muted/70">
                    question {seen.size} · {bank.length} in the bank
                  </p>
                  {seen.size > 1 ? (
                    <button
                      type="button"
                      onClick={endRun}
                      className="label cursor-pointer text-muted/70 underline underline-offset-4 transition-colors hover:text-signal"
                    >
                      end run
                    </button>
                  ) : null}
                </div>
              )}
            </>
          ) : null}
        </main>
      )}

      <footer className="label mt-10 border-t border-ink-line pt-4 text-muted/60">
        Prototype · progress saved on this device only
      </footer>
    </div>
  );
}

function Masthead({ progress, onReset }: { progress: SavedProgress; onReset: () => void }) {
  return (
    <header className="flex items-baseline justify-between border-b border-ink-line py-5">
      <span className="font-display text-2xl tracking-tight">
        Endless <span className="text-signal">AI</span>
      </span>
      <div className="flex items-baseline gap-5">
        <span className="label text-muted">
          elo <span className="ml-1.5 font-mono text-sm text-paper">{progress.rating}</span>
        </span>
        <button
          type="button"
          onClick={onReset}
          className="label cursor-pointer text-muted transition-colors hover:text-signal"
        >
          reset
        </button>
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

function Summary({
  answers,
  correct,
  rating,
  seen,
  bankTotal,
  onRestart,
}: {
  answers: Answer[];
  correct: number;
  rating: number;
  bankSize: number;
  seen: number;
  bankTotal: number;
  onRestart: () => void;
}) {
  const breakdown = useMemo(() => categoryBreakdown(answers), [answers]);
  const overall = Math.round(accuracy(answers) * 100);

  return (
    <main className="flex flex-1 flex-col pt-14">
      <p className="label text-muted">run complete</p>
      <p className="mt-2 font-display text-7xl leading-none tracking-tight">
        {correct}
        <span className="text-3xl text-muted">/{answers.length}</span>
      </p>
      <p className="label mt-4 text-muted">
        {overall}% accuracy · elo {rating} · {tierFor(rating)}
      </p>

      {breakdown.length > 1 ? (
        <ul className="mt-10 flex flex-col gap-3">
          {breakdown.map((row) => {
            const pct = Math.round((row.correct / row.total) * 100);
            return (
              <li key={row.category} className="flex items-center gap-4">
                <span className="label w-32 shrink-0 text-muted">{categoryLabel(row.category)}</span>
                <span className="h-1 flex-1 bg-ink-line">
                  <span
                    className={`block h-full ${pct >= 50 ? "bg-signal" : "bg-fail"}`}
                    style={{ width: `${Math.max(3, pct)}%` }}
                  />
                </span>
                <span className="label w-14 shrink-0 text-right text-muted">
                  {pct}%
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}

      <p className="mt-10 max-w-sm text-sm leading-relaxed text-muted">
        {seen >= bankTotal
          ? `You have been through all ${bankTotal} questions. That is the whole prototype bank.`
          : `You stopped with ${bankTotal - seen} questions still in the bank. The stream refills once it runs dry, and it is not close to dry yet.`}
      </p>

      <button
        type="button"
        onClick={onRestart}
        className="label mt-8 w-fit cursor-pointer border border-signal bg-signal px-6 py-3 text-ink transition-colors hover:bg-paper hover:border-paper"
      >
        play again
      </button>
    </main>
  );
}
