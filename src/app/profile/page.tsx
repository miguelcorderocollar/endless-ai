"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";

import { api } from "../../../convex/_generated/api";
import {
  EMPTY_PROGRESS,
  getProgressSnapshot,
  getProgressServerSnapshot,
  hydrateProgress,
  subscribeProgress,
  updateProgress,
} from "@/lib/progress";
import type { Question } from "@/lib/questions/schema";
import { DoneList } from "@/components/DoneList";
import { Popup } from "@/components/Popup";
import { Shell } from "@/components/QuizFromConvex";
import { SignInForm } from "@/components/Account";
import { Distribution, EloChart } from "@/components/Stats";

function PencilIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();
  const me = useQuery(api.users.me, isAuthenticated ? {} : "skip");
  const bank = useQuery(api.questions.list, {});
  const stats = useQuery(api.answers.myStats, isAuthenticated ? {} : "skip");
  const ensureStats = useMutation(api.answers.ensureStats);
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

  const [popup, setPopup] = useState<"signin" | "name" | "reset" | null>(null);
  const [tab, setTab] = useState<"you" | "all">("you");

  useEffect(() => {
    hydrateProgress();
  }, []);

  useEffect(() => {
    // Signed-in users with events but no rollup get one built on demand, so
    // the profile never shows device-only totals while authenticated.
    if (isAuthenticated && stats === null) void ensureStats();
  }, [isAuthenticated, stats, ensureStats]);

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
    <Shell showElo={false}>
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
            <div className="mt-3 flex items-center justify-between gap-4">
              <h1 className="font-display text-3xl leading-none">
                {me.displayName ?? me.handle ?? "player"}
              </h1>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setPopup("name")}
                  aria-label="edit name"
                  className="cursor-pointer text-muted transition-colors hover:text-signal"
                >
                  <PencilIcon />
                </button>
                <button
                  type="button"
                  onClick={() => setPopup("reset")}
                  aria-label="reset progress"
                  className="cursor-pointer text-muted transition-colors hover:text-fail"
                >
                  <ResetIcon />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void signOut();
                    router.push("/");
                  }}
                  aria-label="sign out"
                  className="cursor-pointer text-muted transition-colors hover:text-signal"
                >
                  <SignOutIcon />
                </button>
              </div>
            </div>
            <p className="label mt-2 text-muted">
              {me.handle ?? ""}
              {me.role === "admin" ? (
                <span className="ml-2 text-signal">admin</span>
              ) : null}
            </p>
          </>
        )}

        <div className="mt-8 border-t border-ink-line pt-6">
          <p className="label text-muted">elo rating</p>
          <p className="mt-2 font-display text-7xl leading-none tracking-tight">
            {stats?.rating ?? progress.rating}
          </p>
          <p className="label mt-4 text-muted">
            {stats
              ? `${stats.answered} answered · streak ${stats.streak} · best ${stats.bestStreak}`
              : isAuthenticated
                ? "no answers yet on this account"
                : "on this device only · sign in to sync"}
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

        <div className="mt-8 border-t border-ink-line pt-6">
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

      {popup === "reset" && !guest ? (
        <Popup label="danger zone" title="Reset progress?" onClose={() => setPopup(null)}>
          <ResetConfirm
            onCancel={() => setPopup(null)}
            onDone={() => {
              updateProgress({ ...EMPTY_PROGRESS });
              window.location.href = "/";
            }}
          />
        </Popup>
      ) : null}
    </Shell>
  );
}

function ResetConfirm({
  onCancel,
  onDone,
}: {
  onCancel: () => void;
  onDone: () => void;
}) {
  const resetProgress = useMutation(api.users.resetProgress);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm leading-relaxed text-muted">
        This deletes every answer you have given: Elo drops back to 1000, your streak,
        per-category accuracy, and done list are wiped. Your account, handle, and
        role stay. <span className="text-fail">There is no undo.</span>
      </p>
      {error ? <span className="text-xs leading-snug text-fail">{error}</span> : null}
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            setError(null);
            void resetProgress({}).then(
              () => onDone(),
              (err: unknown) => {
                setBusy(false);
                setError(err instanceof Error ? err.message : "Could not reset.");
              },
            );
          }}
          className="label cursor-pointer border border-fail bg-fail px-5 py-2.5 text-ink transition-colors hover:bg-paper hover:border-paper disabled:opacity-50"
        >
          {busy ? "resetting…" : "yes, reset everything"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="label cursor-pointer text-muted transition-colors hover:text-signal"
        >
          cancel
        </button>
      </div>
    </div>
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
