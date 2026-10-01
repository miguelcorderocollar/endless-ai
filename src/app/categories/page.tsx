"use client";

import { useQuery, useConvexAuth, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { api } from "../../../convex/_generated/api";
import { CATEGORIES } from "@/lib/questions/schema";
import {
  type CategoryCount,
  readCountsCache,
  writeCountsCache,
} from "@/lib/quiz/bankCache";
import { accuracyByCategory } from "@/lib/quiz/categoryAccuracy";
import { readFilter, writeFilter } from "@/lib/quiz/filter";
import { useIsomorphicLayoutEffect } from "@/lib/useIsomorphicLayoutEffect";
import { Shell } from "@/components/QuizFromConvex";

/**
 * Fun-mode filter (#12): pick 1+ categories, the stream stays inside them.
 * Never touches Elo or ranking. Per-category accuracy bars show where
 * you're strong and where you're not.
 */
export default function CategoriesPage() {
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const counts = useQuery(api.questions.counts, {});
  const stats = useQuery(api.answers.myStats, isAuthenticated ? {} : "skip");
  const ensureStats = useMutation(api.answers.ensureStats);
  const [selected, setSelected] = useState<string[]>([]);
  // Stale-while-revalidate (#31): filter + bracket numbers paint from cache
  // pre-paint. Null/empty through hydration to match SSR — reading
  // localStorage in the initializer would mismatch hydration.
  const [cachedCounts, setCachedCounts] = useState<CategoryCount[] | null>(null);

  useIsomorphicLayoutEffect(() => {
    setSelected(readFilter());
    setCachedCounts(readCountsCache());
  }, []);

  useEffect(() => {
    if (isAuthenticated && stats === null) void ensureStats();
  }, [isAuthenticated, stats, ensureStats]);

  useEffect(() => {
    if (counts && counts.length > 0) writeCountsCache(counts);
  }, [counts]);

  const byCategory = accuracyByCategory(stats?.byCategory);
  const countByCategory = new Map(
    ((counts ?? cachedCounts) ?? []).map((c) => [c.category, c.count]),
  );

  const toggle = (key: string) => {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const play = () => {
    writeFilter(selected);
    // Client navigation (#31): `/` remounts QuizFromConvex, which reads the
    // fresh filter in its state initializer. No full reload, no asset reparse.
    router.push("/");
  };

  return (
    <Shell showElo={false}>
      <main className="flex flex-1 flex-col pt-6">
        <p className="label text-muted">choose a category</p>
        <h1 className="mt-3 font-display text-3xl">
          {selected.length === 0 ? "Everything" : `${selected.length} selected`}
        </h1>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-muted">
          For fun only — filtering never touches your Elo or ranking. Right side is
          your accuracy, the bracketed number is how many questions are in that
          category. A dash means you have not answered it yet.
        </p>

        {/* Instant paint (#31): the category list is static (CATEGORIES), so it
            renders on first paint. Only the bracket counts and accuracy bars
            fill in when their queries land — `…` while loading, cached numbers
            meanwhile. The numbers taking a beat is fine; the list blocking is
            what felt slow. */}
        <ul className="stagger mt-8 flex flex-col gap-2">
          {CATEGORIES.map((cat) => {
            const count = countByCategory.get(cat.key);
              const perf = byCategory.get(cat.key);
              const pct = perf?.pct ?? null;
              const active = selected.includes(cat.key);
              return (
                <li key={cat.key}>
                  <button
                    type="button"
                    onClick={() => toggle(cat.key)}
                    aria-pressed={active}
                    className={`flex w-full items-center gap-4 border px-4 py-3 text-left transition-colors duration-150 ${
                      active
                        ? "border-signal bg-signal text-ink"
                        : "border-ink-line text-paper hover:border-paper/50 hover:bg-paper/[0.04]"
                    }`}
                  >
                    <span className="flex w-44 shrink-0 items-baseline gap-2">
                      <span className="text-[0.95rem] leading-snug">{cat.label}</span>
                      <span className={`label ${active ? "text-ink/60" : "text-muted/60"}`}>
                        [{count ?? "…"}]
                      </span>
                    </span>
                    <span
                      className={`h-1 flex-1 ${
                        active ? "bg-ink/20" : "bg-ink-line"
                      }`}
                    >
                      <span
                        className={`block h-full ${
                          active ? "bg-ink" : pct !== null && pct >= 50 ? "bg-signal" : "bg-fail"
                        }`}
                        style={{ width: `${pct ?? 0}%` }}
                      />
                    </span>
                    <span
                      className={`label w-16 shrink-0 text-right ${
                        active ? "text-ink" : pct !== null ? "text-paper" : "text-muted/40"
                      }`}
                    >
                      {pct !== null ? `${pct}%` : "—"}
                    </span>
                  </button>
                </li>
              );
            })}
        </ul>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={play}
            className="label w-fit cursor-pointer border border-signal bg-signal px-6 py-3 text-ink transition-colors hover:bg-paper hover:border-paper"
          >
            {selected.length === 0 ? "play everything" : "play selected"}
          </button>
          {selected.length > 0 ? (
            <button
              type="button"
              onClick={() => setSelected([])}
              className="label cursor-pointer text-muted transition-colors hover:text-signal"
            >
              clear
            </button>
          ) : null}
        </div>
      </main>
    </Shell>
  );
}
