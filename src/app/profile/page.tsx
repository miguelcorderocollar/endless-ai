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

export default function ProfilePage() {
  const router = useRouter();
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();
  const me = useQuery(api.users.me, isAuthenticated ? {} : "skip");
  const bank = useQuery(api.questions.list, {});
  const progress = useSyncExternalStore(
    subscribeProgress,
    getProgressSnapshot,
    getProgressServerSnapshot,
  );

  const [popup, setPopup] = useState<"signin" | "name" | null>(null);

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
          <p className="label text-muted">done</p>
          {bank === undefined ? (
            <p className="mt-3 text-sm text-muted">Loading done list…</p>
          ) : (
            <div className="mt-2">
              <DoneList bank={questions} completedIds={progress.completed} />
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
