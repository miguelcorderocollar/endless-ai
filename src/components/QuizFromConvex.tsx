"use client";

import Link from "next/link";
import { useConvex, useConvexAuth, useQuery } from "convex/react";
import type { ConvexReactClient } from "convex/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { api } from "../../convex/_generated/api";
import type { Question } from "@/lib/questions/schema";
import { readDrawCache, writeDrawCache } from "@/lib/quiz/bankCache";
import { readFilter } from "@/lib/quiz/filter";
import { readProgress } from "@/lib/progress";
import { useIsomorphicLayoutEffect } from "@/lib/useIsomorphicLayoutEffect";
import { Quiz } from "./Quiz";
import { QuizSkeleton, Shell } from "./Skeletons";

export { Shell };

const PAGE = 20;

/**
 * Remembers for the session that the backend predates `ratingHint` (#32), so
 * every draw pays at most one validation failure. Module-level: survives
 * client-side navigation, resets on full reload (by which time the backend
 * may have been synced, so we probe again).
 */
let hintUnsupported = false;

type DrawArgs = {
  excludeIds: string[];
  count: number;
  categories: string[];
  ratingHint: number;
};

/**
 * Draws a page, degrading gracefully on an unsynced backend. Convex rejects
 * unknown args, so a backend predating `ratingHint` fails validation — retry
 * once without it (uniform draw, the old behavior) instead of breaking the
 * quiz. Other errors (offline, auth) propagate to the callers' handling.
 */
async function drawPage(client: ConvexReactClient, args: DrawArgs) {
  if (!hintUnsupported) {
    try {
      return await client.query(api.questions.draw, args);
    } catch (err) {
      if (err instanceof Error && /ratingHint|extra field/i.test(err.message)) {
        hintUnsupported = true;
      } else {
        throw err;
      }
    }
  }
  return await client.query(api.questions.draw, {
    excludeIds: args.excludeIds,
    count: args.count,
    categories: args.categories,
  });
}

type DrawRow = {
  questionId: string;
  text: string;
  options: string[];
  answer: string;
  category: string;
  difficulty: number;
  explanation: string;
  source: Question["source"];
  tags: string[];
  addedAt: string;
};

function toQuestion(q: DrawRow): Question {
  return {
    id: q.questionId,
    text: q.text,
    options: [...q.options] as [string, string, string, string],
    answer: q.answer,
    category: q.category as Question["category"],
    tags: [...q.tags],
    difficulty: q.difficulty,
    explanation: q.explanation,
    source: q.source,
    answerAliases: [],
    status: "published" as const,
    addedAt: q.addedAt,
  };
}

/**
 * Plays from the published Convex questions table in pages (#25), not the
 * whole bank. First page excludes the done list (local + server when signed
 * in, so an existing account never replays its history on a fresh device);
 * top-ups exclude everything seen so far. Page loads transfer O(1) questions
 * regardless of bank size.
 *
 * Stale-while-revalidate (#31): the last draw snapshot is cached locally per
 * filter. Repeat visits paint the cached questions instantly (no skeleton),
 * then revalidate in the background and merge fresh rows. Only a true first
 * run with an empty cache blocks on the network.
 */
export function QuizFromConvex() {
  const client = useConvex();
  const { isAuthenticated } = useConvexAuth();
  const serverCompleted = useQuery(
    api.answers.myCompleted,
    isAuthenticated ? {} : "skip",
  );
  const [filter] = useState<string[]>(() => readFilter());
  // Null through hydration (matches the SSR skeleton), then painted from the
  // local snapshot in a layout effect: before paint, so repeat visits never
  // see the skeleton and never mismatch hydration.
  const [bank, setBank] = useState<Question[] | null>(null);
  const [initial, setInitial] = useState<Question | null>(null);
  const hadCache = useRef(false);
  const categories = useMemo(
    () => new Set(filter as Question["category"][]),
    [filter],
  );

  useIsomorphicLayoutEffect(() => {
    const cached = readDrawCache(filter);
    if (cached && cached.length > 0) {
      hadCache.current = true;
      setBank(cached);
      setInitial(cached[Math.floor(Math.random() * cached.length)] ?? null);
    }
  }, [filter]);

  useEffect(() => {
    if (isAuthenticated && serverCompleted === undefined) return;
    let cancelled = false;
    const excludeIds = [
      ...new Set([...readProgress().completed, ...(serverCompleted ?? [])]),
    ];
    void drawPage(client, {
      excludeIds,
      count: PAGE,
      categories: filter,
      ratingHint: readProgress().rating,
    })
      .then((rows) => {
        if (cancelled) return;
        const questions = rows.map(toQuestion);
        if (questions.length === 0) {
          // Empty draw with a painted cache means the player is mid-game on
          // stale questions (done list grew since the snapshot): keep playing
          // the cache, the top-up path will page past it. Only an uncached
          // first run is truly empty.
          if (!hadCache.current) {
            setBank([]);
            setInitial(null);
          }
          return;
        }
        writeDrawCache(filter, questions);
        if (hadCache.current) {
          // Background revalidate: merge without swapping the live question.
          setBank((prev) => {
            if (!prev) return questions;
            const known = new Set(prev.map((q) => q.id));
            const fresh = questions.filter((q) => !known.has(q.id));
            return fresh.length > 0 ? [...prev, ...fresh] : prev;
          });
        } else {
          setBank(questions);
          setInitial(
            questions[Math.floor(Math.random() * questions.length)] ?? null,
          );
        }
      })
      .catch(() => {
        // Offline with no cache: surface the empty-bank frame, not a hang.
        // Offline with cache: keep playing stale, the error is invisible.
        if (!cancelled && !hadCache.current) setBank([]);
      });
    return () => {
      cancelled = true;
    };
  }, [client, isAuthenticated, serverCompleted, filter]);

  const topUp = useCallback(
    async (seen: Set<string>): Promise<Question[]> => {
      const excludeIds = [
        ...new Set([...(serverCompleted ?? []), ...seen]),
      ].slice(-1000);
      const rows = await drawPage(client, {
        excludeIds,
        count: PAGE,
        categories: filter,
        ratingHint: readProgress().rating,
      });
      const fresh = rows.map(toQuestion);
      setBank((prev) => {
        const next = !prev
          ? fresh
          : [...prev, ...fresh.filter((q) => !new Set(prev.map((p) => p.id)).has(q.id))];
        writeDrawCache(filter, next.slice(-60));
        return next;
      });
      return fresh;
    },
    [client, serverCompleted, filter],
  );

  // The filter is fixed per mount: picking categories navigates client-side
  // back to `/`, which remounts with the fresh filter (no full reload).

  if (bank === null || initial === null) return <QuizSkeleton />;

  if (bank.length === 0) {
    const completed = readProgress().completed.length;
    return (
      <Shell>
        <main className="flex flex-1 flex-col pt-14">
          <p className="label text-muted">
            {completed > 0 ? "bank complete" : "empty bank"}
          </p>
          <h1 className="mt-3 font-display text-3xl">
            {completed > 0
              ? "Every question, answered right"
              : "Nothing published yet"}
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
            {completed > 0 ? (
              <Link
                href="/profile"
                className="label cursor-pointer text-muted transition-colors hover:text-signal"
              >
                see your done list →
              </Link>
            ) : (
              <>
                Run <span className="font-mono">npx convex dev</span> and then{" "}
                <span className="font-mono">npx tsx scripts/publish.mts</span> to sync
                the validated bank.
              </>
            )}
          </p>
        </main>
      </Shell>
    );
  }

  return <Quiz bank={bank} initial={initial} onNeedMore={topUp} categories={categories} />;
}
