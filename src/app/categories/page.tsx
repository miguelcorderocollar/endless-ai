"use client";

import { useQuery, useConvexAuth, useMutation } from "convex/react";
import { useEffect, useState } from "react";

import { api } from "../../../convex/_generated/api";
import { CATEGORIES } from "@/lib/questions/schema";
import { readFilter, writeFilter } from "@/lib/quiz/filter";
import { Shell } from "@/components/QuizFromConvex";

/**
 * Fun-mode filter (#12): pick 1+ categories, the stream stays inside them.
 * Never touches Elo or ranking. Per-category accuracy bars show where
 * you're strong and where you're not.
 */
export default function CategoriesPage() {
  const { isAuthenticated } = useConvexAuth();
  const counts = useQuery(api.questions.counts, {});
  const stats = useQuery(api.answers.myStats, isAuthenticated ? {} : "skip");
  const ensureStats = useMutation(api.answers.ensureStats);
  const [selected, setSelected] = useState<string[]>(() => readFilter());

  useEffect(() => {
    if (isAuthenticated && stats === null) void ensureStats();
  }, [isAuthenticated, stats, ensureStats]);

  const byCategory = new Map<string, { answered: number; correct: number }>(
    (stats?.byCategory ?? []).map((c) => [
      c.category,
      { answered: c.answered, correct: c.correct },
    ]),
  );
  const countByCategory = new Map(
    (counts ?? []).map((c) => [c.category, c.count]),
  );

  const toggle = (key: string) => {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const play = () => {
    writeFilter(selected);
    // Full reload: the quiz reads the filter once per page load.
    window.location.assign("/");
  };

  return (
    <Shell showElo={false}>
      <main className="flex flex-1 flex-col pt-14">
        <p className="label text-muted">choose a category</p>
        <h1 className="mt-3 font-display text-3xl">
          {selected.length === 0 ? "Everything" : `${selected.length} selected`}
        </h1>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-muted">
          For fun only — filtering never touches your Elo or ranking. Right side is
          your accuracy, the bracketed number is how many questions are in that
          category. A dash means you have not answered it yet.
        </p>

        {counts === undefined ? (
          <p className="mt-8 text-sm text-muted">Loading categories…</p>
        ) : (
          <ul className="stagger mt-8 flex flex-col gap-2">
            {CATEGORIES.map((cat) => {
              const count = countByCategory.get(cat.key) ?? 0;
              const perf = byCategory.get(cat.key);
              const pct =
                perf && perf.answered > 0
                  ? Math.round((perf.correct / perf.answered) * 100)
                  : null;
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
                        [{count}]
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
        )}

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
