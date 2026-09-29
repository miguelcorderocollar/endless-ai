"use client";

import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { useMemo } from "react";

import { Shell } from "./QuizFromConvex";

export function ConvexClientProvider({ children }: { children: React.ReactNode }) {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  const client = useMemo(() => (url ? new ConvexReactClient(url) : null), [url]);

  if (!client) {
    return (
      <Shell>
        <main className="flex flex-1 flex-col pt-14">
          <p className="label text-muted">backend not configured</p>
          <h1 className="mt-3 font-display text-3xl">No Convex URL</h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
            Set <span className="font-mono">NEXT_PUBLIC_CONVEX_URL</span> by running{" "}
            <span className="font-mono">npx convex dev</span>, then reload. See{" "}
            <span className="font-mono">docs/deployment.md</span>.
          </p>
        </main>
      </Shell>
    );
  }
  return <ConvexAuthProvider client={client}>{children}</ConvexAuthProvider>;
}
