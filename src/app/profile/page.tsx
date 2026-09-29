"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";

import { api } from "../../../convex/_generated/api";
import {
  getProgressSnapshot,
  getProgressServerSnapshot,
  hydrateProgress,
  subscribeProgress,
} from "@/lib/progress";
import type { Question } from "@/lib/questions/schema";
import { DoneList } from "@/components/DoneList";
import { Popup } from "@/components/Popup";
import { Shell } from "@/components/QuizFromConvex";
import { SignInForm } from "@/components/Account";
import { Distribution, EloChart } from "@/components/Stats";

export default function ProfilePage() {
  const router = useRouter();
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();
  const me = useQuery(api.users.me, isAuthenticated ? {} : "skip");
  const bank = useQuery(api.questions.list, {});
  const stats = useQuery(api.answers.myStats, isAuthenticated ? {} : "skip");
  const history = useQuery(api.stats.history, isAuthenticated ? {} : "skip");
  const population = useQuery(api.stats.population, {});
  const serverCompleted = useQuery(
    api.answers.myCompleted,
    isAuthenticated ? {} : "skip",
  );
  const progress = useSyncExternalStore(
    subscribeProgress,
    getProgressSnapshot,
    getProgressServerSnapshot,
  );

  const [popup, setPopup] = useState<"signin" | "name" | null>(null);
  const [tab, setTab] = useState<"you" | "all">("you");

  useEffect(() => {
    hydrateProgress();
  }, []);

  const questions: Question[] =
    bank?.map((q) => ({
      id: q.questionId,
      text: q.text,
      options: [...q.options] as [string, string, string, string],
      answer: q.answer,
      category: q.category as Question["category"],
      tags: [...q.tags],
      difficulty: q.difficulty,
      explanation: q.explanation,
      source: q.source as Question["source"],
      answerAliases: [],
      status: "published" as const,
      addedAt: q.addedAt,
    })) ?? [];

  const guest = !isAuthenticated || !me || me.isAnonymous;

  return (
    <Shell>
      <main className="flex flex-1 flex-col pt-14">
        <p className="label text-muted">profile</p>

        {isLoading || (isAuthenticated && me === undefined) ? (
          <h1 className="mt-3 font-display text-3xl">Loading…</h1>
        ) : guest ? (
          <>
            <h1 className="mt-3 font-display text-3xl">Playing as guest</h1>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
              Your Elo and done list live on this device only. Sign in to keep them on
              every device.
            </p>
            <button
              type="button"
              onClick={() => setPopup("signin")}
              className="label mt-8 w-fit cursor-pointer border border-signal bg-signal px-6 py-3 text-ink transition-colors hover:bg-paper hover:border-paper"
            >
              sign in
            </button>
          </>
        ) : (
          <>
            <h1 className="mt-3 font-display text-3xl">
              {me.displayName ?? me.handle ?? "player"}
            </h1>
            <p className="label mt-4 text-muted">
              {me.handle ?? ""}{" "}
              {me.role === "admin" ? (
                <span className="ml-2 text-signal">admin</span>
              ) : null}
            </p>
            <button
              type="button"
              onClick={() => setPopup("name")}
              className="label mt-6 w-fit cursor-pointer text-muted transition-colors hover:text-signal"
            >
              edit name
            </button>
            <button
              type="button"
              onClick={() => {
                void signOut();
                router.push("/");
              }}
              className="label mt-4 w-fit cursor-pointer text-muted transition-colors hover:text-signal"
            >
              sign out
            </button>
          </>
        )}

        <div className="mt-12 border-t border-ink-line pt-8">
          <p className="label text-muted">elo rating</p>
          <p className="mt-2 font-display text-7xl leading-none tracking-tight">
            {stats?.rating ?? progress.rating}
          </p>
          <p className="label mt-4 text-muted">
            {stats
              ? `${stats.answered} answered · streak ${stats.streak} · best ${stats.bestStreak}`
              : `${progress.answered} answered on this device`}
          </p>

          <div className="mt-8 flex gap-3">
            {(["you", "all"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                aria-pressed={tab === t}
                className={`label cursor-pointer border px-4 py-2 transition-colors ${
                  tab === t
                    ? "border-signal bg-signal text-ink"
                    : "border-ink-line text-muted hover:text-signal"
                }`}
              >
                {t === "you" ? "you" : "all players"}
              </button>
            ))}
          </div>

          {tab === "you" ? (
            history === undefined ? (
              <p className="mt-3 text-sm text-muted">Loading your line…</p>
            ) : (
              <EloChart points={history} median={population?.median ?? null} />
            )
          ) : population === undefined ? (
            <p className="mt-3 text-sm text-muted">Loading the field…</p>
          ) : (
            <Distribution
              buckets={population.buckets}
              count={population.count}
              median={population.median}
              percentile={population.percentile}
              rating={stats?.rating ?? null}
            />
          )}
        </div>

        <div className="mt-12 border-t border-ink-line pt-8">
          <p className="label text-muted">done</p>
          {bank === undefined ? (
            <p className="mt-3 text-sm text-muted">Loading done list…</p>
          ) : (
            <div className="mt-2">
              <DoneList
                bank={questions}
                completedIds={
                  isAuthenticated
                    ? (serverCompleted ?? progress.completed)
                    : progress.completed
                }
                correct={stats?.correct ?? progress.correct}
                answered={stats?.answered ?? progress.answered}
                total={questions.length}
              />
            </div>
          )}
        </div>

        <a
          href="/"
          className="label mt-10 w-fit cursor-pointer text-muted transition-colors hover:text-signal"
        >
          ← keep playing
        </a>
      </main>

      {popup === "signin" ? (
        <Popup label="account" title="Sign in" onClose={() => setPopup(null)}>
          <SignInForm
            layout="dialog"
            onDone={() => setPopup(null)}
            onSignOut={() => {
              void signOut();
              setPopup(null);
            }}
          />
        </Popup>
      ) : null}

      {popup === "name" && !guest && me ? (
        <Popup label="profile" title="Display name" onClose={() => setPopup(null)}>
          <DisplayNameForm
            current={me.displayName ?? ""}
            onSaved={() => setPopup(null)}
          />
        </Popup>
      ) : null}
    </Shell>
  );
}

function DisplayNameForm({
  current,
  onSaved,
}: {
  current: string;
  onSaved: () => void;
}) {
  const setDisplayName = useMutation(api.users.setDisplayName);
  const [name, setName] = useState(current);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        void setDisplayName({ displayName: name }).then(
          () => onSaved(),
          (err: unknown) =>
            setError(err instanceof Error ? err.message : "Could not save."),
        );
      }}
      className="flex flex-col gap-4"
    >
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        maxLength={40}
        placeholder="what should we call you"
        className="border-b border-ink-line bg-transparent py-1.5 text-sm text-paper placeholder:text-muted/50 focus:border-signal focus:outline-none"
      />
      {error ? <span className="text-xs leading-snug text-fail">{error}</span> : null}
      <button
        type="submit"
        className="label w-fit cursor-pointer border border-signal bg-signal px-6 py-2.5 text-ink transition-colors hover:bg-paper hover:border-paper"
      >
        save
      </button>
    </form>
  );
}
