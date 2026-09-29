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
import { pickNext } from "@/lib/quiz/engine";
import { scoreAnswer } from "@/lib/quiz/elo";
import { sourceHref, sourceLabel } from "@/lib/questions/schema";
import type { Question } from "@/lib/questions/schema";

type Phase = "question" | "revealed";

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
  const [view, setView] = useState<"quiz" | "done">("quiz");
  const [exhausted, setExhausted] = useState(false);

  useEffect(() => {
    hydrateProgress();
  }, []);

  const nextQuestion = useCallback(() => {
    const next = pickNext(bank, seen, new Set<Question["category"]>());
    if (!next) {
      setExhausted(true);
      setView("done");
      return;
    }
    setSeen((prev) => new Set(prev).add(next.id));
    setCurrent(next);
    setPicked(null);
    setPhase("question");
  }, [bank, seen]);

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
        lastPlayed: new Date().toISOString().slice(0, 10),
      });
    },
    [current, phase, progress],
  );

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-5 pb-10">
      <Masthead
        progress={progress}
        view={view}
        onShowDone={() => setView("done")}
        onShowQuiz={() => setView("quiz")}
      />

      {view === "done" ? (
        <DoneView
          bank={bank}
          completedIds={progress.completed}
          exhausted={exhausted}
          onBack={() => setView("quiz")}
        />
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

function Masthead({
  progress,
  view,
  onShowDone,
  onShowQuiz,
}: {
  progress: SavedProgress;
  view: "quiz" | "done";
  onShowDone: () => void;
  onShowQuiz: () => void;
}) {
  return (
    <header className="flex items-baseline justify-between border-b border-ink-line py-5">
      <span className="font-display text-2xl tracking-tight">
        Endless <span className="text-signal">AI</span>
      </span>
      <div className="flex items-baseline gap-5">
        <span className="label text-muted">
          elo <span className="ml-1.5 font-mono text-sm text-paper">{progress.rating}</span>
        </span>
        {view === "quiz" ? (
          <button
            type="button"
            onClick={onShowDone}
            className="label cursor-pointer text-muted transition-colors hover:text-signal"
          >
            done {progress.completed.length}
          </button>
        ) : (
          <button
            type="button"
            onClick={onShowQuiz}
            className="label cursor-pointer text-muted transition-colors hover:text-signal"
          >
            ← play
          </button>
        )}
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

function DoneView({
  bank,
  completedIds,
  exhausted,
  onBack,
}: {
  bank: Question[];
  completedIds: string[];
  exhausted: boolean;
  onBack: () => void;
}) {
  const done = useMemo(() => {
    const byId = new Map(bank.map((q) => [q.id, q]));
    return completedIds.flatMap((id) => {
      const q = byId.get(id);
      return q ? [q] : [];
    });
  }, [bank, completedIds]);

  return (
    <main className="flex flex-1 flex-col pt-14">
      <p className="label text-muted">
        {exhausted ? "bank complete" : `done · ${done.length}`}
      </p>
      <p className="mt-2 font-display text-7xl leading-none tracking-tight">{done.length}</p>
      <p className="label mt-4 text-muted">
        {exhausted
          ? `every question in the bank, answered right`
          : "questions answered right · misses come back"}
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

      <button
        type="button"
        onClick={onBack}
        className="label mt-8 w-fit cursor-pointer border border-signal bg-signal px-6 py-3 text-ink transition-colors hover:bg-paper hover:border-paper"
      >
        keep playing
      </button>
    </main>
  );
}
