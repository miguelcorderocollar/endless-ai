"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";

import { SignInForm } from "@/components/Account";
import { Shell } from "@/components/QuizFromConvex";

export default function SignInPage() {
  const router = useRouter();
  const { signOut } = useAuthActions();

  return (
    <Shell>
      <main className="flex flex-1 flex-col pt-14">
        <p className="label text-muted">account</p>
        <h1 className="mt-3 font-display text-3xl">Sign in to Endless AI</h1>
        <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
          One account keeps your Elo, streak and done list on every device. Guests keep
          playing locally — nothing is lost by waiting.
        </p>
        <div className="mt-8">
          <SignInForm
            layout="page"
            onDone={() => router.push("/")}
            onSignOut={() => void signOut()}
          />
        </div>
      </main>
    </Shell>
  );
}
