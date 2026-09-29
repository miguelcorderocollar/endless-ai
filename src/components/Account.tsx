"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";

import { api } from "../../convex/_generated/api";

/**
 * Silent guest identity: every visitor gets an anonymous session (a real
 * users row), so future answer events have an owner from day one. Signing
 * up with a password upgrades the same row — rating, streak and history
 * carry over with no merge UI.
 */
export function Account() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { signIn, signOut } = useAuthActions();
  const me = useQuery(api.users.me, isAuthenticated ? {} : "skip");
  const ensureProfile = useMutation(api.users.ensureProfile);

  const guestStarted = useRef(false);
  const profileEnsured = useRef(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !guestStarted.current) {
      guestStarted.current = true;
      void signIn("anonymous");
    }
    if (!isAuthenticated) profileEnsured.current = false;
  }, [isLoading, isAuthenticated, signIn]);

  useEffect(() => {
    if (isAuthenticated && !profileEnsured.current) {
      profileEnsured.current = true;
      void ensureProfile();
    }
  }, [isAuthenticated, ensureProfile]);

  if (isLoading || (isAuthenticated && me === undefined)) {
    return <span className="label text-muted/50">…</span>;
  }

  if (!isAuthenticated || !me || me.isAnonymous) {
    return (
      <a
        href="/signin"
        className="label cursor-pointer text-muted transition-colors hover:text-signal"
      >
        sign in
      </a>
    );
  }

  return (
    <span className="flex items-baseline gap-5">
      <span className="label text-paper">{me.displayName ?? me.handle ?? "player"}</span>
      <button
        type="button"
        onClick={() => void signOut()}
        className="label cursor-pointer text-muted transition-colors hover:text-signal"
      >
        out
      </button>
    </span>
  );
}

/**
 * Raw auth errors carry request IDs and stack traces. Unwrap our server
 * messages (ConvexError) and map known Auth.js codes to human copy.
 * Returns the message plus whether the UI should flip to signup
 * (sign-in attempted on an email with no account).
 */
function interpretAuthError(
  err: unknown,
  flow: "signIn" | "signUp",
): { message: string; flipToSignUp: boolean } {
  const raw = err instanceof Error ? err.message : String(err);
  const serverMessage = raw.match(/(?:Uncaught (?:Convex)?Error|ConvexError):\s*([^]+?)(?:\s+at\s|\s*$)/)?.[1]?.trim();

  if (/InvalidAccountId/i.test(raw)) {
    return flow === "signIn"
      ? {
          message: "No account with that email yet — pick a password to create one.",
          flipToSignUp: true,
        }
      : { message: "Could not use those credentials.", flipToSignUp: false };
  }
  if (/InvalidPassword|invalid credentials|verify the password/i.test(raw)) {
    return { message: "Wrong password for that email.", flipToSignUp: false };
  }
  if (serverMessage) return { message: serverMessage, flipToSignUp: false };
  return { message: "Could not sign in. Try again.", flipToSignUp: false };
}

export function SignInForm({
  onDone,
  onSignOut,
  layout = "panel",
}: {
  onDone: () => void;
  onSignOut: () => void;
  layout?: "panel" | "page" | "dialog";
}) {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [error, setError] = useState<string | null>(null);

  const frame =
    layout === "panel"
      ? "absolute right-0 top-7 z-10 block w-64 border border-ink-line bg-ink-raised p-4"
      : layout === "dialog"
        ? "block w-full"
        : "block w-full max-w-sm";

  return (
    <span className={frame}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          const formData = new FormData(event.currentTarget);
          void signIn("password", formData).then(
            () => onDone(),
            (err: unknown) => {
              const interpreted = interpretAuthError(err, flow);
              if (interpreted.flipToSignUp) setFlow("signUp");
              setError(interpreted.message);
            },
          );
        }}
        className="flex flex-col gap-3"
      >
        <input
          name="email"
          type="email"
          required
          placeholder="email"
          autoComplete="email"
          className="border-b border-ink-line bg-transparent py-1.5 text-sm text-paper placeholder:text-muted/50 focus:border-signal focus:outline-none"
        />
        <input
          name="password"
          type="password"
          required
          minLength={8}
          placeholder="password (8+)"
          autoComplete={flow === "signUp" ? "new-password" : "current-password"}
          className="border-b border-ink-line bg-transparent py-1.5 text-sm text-paper placeholder:text-muted/50 focus:border-signal focus:outline-none"
        />
        <input name="flow" type="hidden" value={flow} />
        <button
          type="submit"
          className="label mt-1 cursor-pointer border border-signal bg-signal px-4 py-2 text-ink transition-colors hover:bg-paper hover:border-paper"
        >
          {flow === "signIn" ? "sign in" : "create account"}
        </button>
        {error ? <span className="text-xs leading-snug text-fail">{error}</span> : null}
      </form>
      <span className="mt-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            setError(null);
            setFlow(flow === "signIn" ? "signUp" : "signIn");
          }}
          className="label cursor-pointer text-muted transition-colors hover:text-signal"
        >
          {flow === "signIn" ? "new here? sign up" : "have an account? sign in"}
        </button>
        <button
          type="button"
          onClick={onSignOut}
          className="label cursor-pointer text-muted/60 transition-colors hover:text-signal"
        >
          forget me
        </button>
      </span>
    </span>
  );
}
