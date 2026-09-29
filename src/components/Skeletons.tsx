"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

import {
  getProgressServerSnapshot,
  getProgressSnapshot,
  subscribeProgress,
} from "@/lib/progress";

const LETTERS = ["A", "B", "C", "D"] as const;

/**
 * Shared loading skeletons (#35). One style everywhere: pulse bars with
 * staggered delays, static when reduced motion is preferred. Each block is
 * a single `role="status"` with an sr-only label; the shimmer shapes are
 * `aria-hidden` so screen readers hear one message, not a dozen bars.
 * Every skeleton mirrors its real layout so the swap-in doesn't jump.
 */

/**
 * Same frame as Quiz (masthead + footer) so the swap-in doesn't jump. When
 * the Elo side shows, it mirrors the Quiz masthead: Elo + cats + profile
 * gear on the same geometry.
 */
export function Shell({
  children,
  showElo = true,
}: {
  children: React.ReactNode;
  showElo?: boolean;
}) {
  // Instant Elo (#31): the loading frame already knows the local rating, so
  // the masthead never flashes a dash while questions load.
  const progress = useSyncExternalStore(
    subscribeProgress,
    getProgressSnapshot,
    getProgressServerSnapshot,
  );
  return (
    <div className="frame-x frame-t frame-b mx-auto flex min-h-dvh w-full max-w-2xl flex-col">
      <header className="flex items-center justify-between border-b border-ink-line py-4">
        <span className="font-display text-2xl tracking-tight">
          <Link href="/" aria-label="back to the game">
            Endless <span className="text-signal">AI</span>
          </Link>
        </span>
        {showElo ? (
          <div className="flex items-center gap-5">
            <span className="label text-muted">
              elo <span className="ml-1.5 font-mono text-sm text-paper">{progress.rating}</span>
            </span>
            <Link
              href="/categories"
              className="label cursor-pointer text-muted transition-colors hover:text-signal"
            >
              cats
            </Link>
            <Link
              href="/profile"
              aria-label="profile and settings"
              className="text-muted transition-colors hover:text-signal"
            >
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </Link>
          </div>
        ) : null}
      </header>
      {children}
    </div>
  );
}

/** First paint of `/`: same frame as Quiz (masthead + question + options). */
export function QuizSkeleton() {
  return (
    <Shell>
      <main className="flex flex-1 flex-col pt-4" role="status" aria-busy="true">
        <span className="sr-only">Loading questions…</span>
        <div className="stagger pt-3" aria-hidden="true">
          <div className="mt-3 flex flex-col gap-3">
            <span className="block h-9 w-full bg-paper/[0.07] motion-safe:animate-pulse" />
            <span
              className="block h-9 w-3/5 bg-paper/[0.07] motion-safe:animate-pulse"
              style={{ animationDelay: "0.15s" }}
            />
          </div>
        </div>

        <ul className="stagger mt-8 flex flex-col gap-2" aria-hidden="true">
          {LETTERS.map((letter, i) => (
            <li
              key={letter}
              className="flex w-full items-center gap-4 border border-ink-line px-4 py-3.5"
            >
              <span className="label mt-0.5 w-4 shrink-0 opacity-60">{letter}</span>
              <span
                className="block h-4 bg-paper/[0.07] motion-safe:animate-pulse"
                style={{
                  width: `${[78, 62, 71, 55][i]}%`,
                  animationDelay: `${0.1 + i * 0.12}s`,
                }}
              />
            </li>
          ))}
        </ul>
      </main>
    </Shell>
  );
}

/**
 * Profile header while auth resolves on a true first run (returning users
 * paint the cached name instead, so this is rarely seen). Mirrors the
 * signed-in header exactly: name row with action icons + handle line, so the
 * swap-in doesn't jump.
 */
export function ProfileHeaderSkeleton() {
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">Loading profile…</span>
      <div aria-hidden="true">
        <div className="mt-3 flex items-center justify-between gap-4">
          <span className="block h-[30px] w-52 bg-paper/[0.07] motion-safe:animate-pulse" />
          <span className="flex items-center gap-4">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="block size-4 bg-paper/[0.07] motion-safe:animate-pulse"
                style={{ animationDelay: `${i * 0.12}s` }}
              />
            ))}
          </span>
        </div>
        <span
          className="mt-2 block h-3 w-40 bg-paper/[0.07] motion-safe:animate-pulse"
          style={{ animationDelay: "0.15s" }}
        />
      </div>
    </div>
  );
}

/**
 * Chart + distribution share one fixed visual height (h-60) inside a
 * min-height tab panel (see profile page): switching tabs or resolving
 * skeletons never moves the done section below.
 */

/** Profile "you" tab while history loads: matches the EloChart frame. */
export function ChartSkeleton() {
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">Loading your chart…</span>
      <div
        aria-hidden="true"
        className="flex h-60 w-full flex-col justify-between border border-ink-line p-4"
      >
        {[88, 64, 76, 42].map((w, i) => (
          <span
            key={i}
            className="block h-2 bg-paper/[0.07] motion-safe:animate-pulse"
            style={{ width: `${w}%`, animationDelay: `${i * 0.12}s` }}
          />
        ))}
        <span
          className="block h-[3px] w-full bg-signal/30 motion-safe:animate-pulse"
          style={{ animationDelay: "0.5s" }}
        />
      </div>
    </div>
  );
}

/** Profile "all players" tab while population loads: matches Distribution. */
export function DistributionSkeleton() {
  const bars = [34, 52, 44, 66, 58, 78, 70, 92, 84, 62, 48, 40, 30, 26, 20, 16, 12, 10, 8, 6];
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">Loading the field…</span>
      <div aria-hidden="true">
        <div className="flex h-60 items-end gap-[3px]">
          {bars.map((h, i) => (
            <span
              key={i}
              className="flex-1 bg-paper/[0.07] motion-safe:animate-pulse"
              style={{ height: `${h}%`, animationDelay: `${(i % 5) * 0.1}s` }}
            />
          ))}
        </div>
        <div className="label mt-2 flex justify-between text-muted/40">
          <span>800</span>
          <span>1600</span>
          <span>2400</span>
        </div>
        <span
          className="mt-4 block h-4 w-3/4 bg-paper/[0.07] motion-safe:animate-pulse"
          style={{ animationDelay: "0.2s" }}
        />
      </div>
    </div>
  );
}

/** Profile done section while the bank loads: matches DoneList shape. */
export function DoneListSkeleton() {
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">Loading done list…</span>
      <div aria-hidden="true">
        <span className="mt-2 block h-16 w-40 bg-paper/[0.07] motion-safe:animate-pulse" />
        <span
          className="mt-4 block h-3 w-56 max-w-full bg-paper/[0.07] motion-safe:animate-pulse"
          style={{ animationDelay: "0.15s" }}
        />
        <span
          className="mt-10 block h-3 w-32 bg-paper/[0.07] motion-safe:animate-pulse"
          style={{ animationDelay: "0.2s" }}
        />
        <ul className="flex flex-col gap-5">
          {[92, 78, 85].map((w, i) => (
            <li key={i} className="border-t border-ink-line pt-4">
              <span
                className="block h-4 bg-paper/[0.07] motion-safe:animate-pulse"
                style={{ width: `${w}%`, animationDelay: `${0.1 + i * 0.12}s` }}
              />
              <span
                className="mt-2 block h-3 w-24 bg-paper/[0.07] motion-safe:animate-pulse"
                style={{ animationDelay: `${0.2 + i * 0.12}s` }}
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Categories list while counts load: 8 rows matching the picker buttons. */
export function CategoriesSkeleton() {
  return (
    <div className="mt-8" role="status" aria-busy="true">
      <span className="sr-only">Loading categories…</span>
      <ul className="stagger flex flex-col gap-2" aria-hidden="true">
        {Array.from({ length: 8 }, (_, i) => (
          <li
            key={i}
            className="flex w-full items-center gap-4 border border-ink-line px-4 py-3"
          >
            <span
              className="block h-4 w-44 shrink-0 bg-paper/[0.07] motion-safe:animate-pulse"
              style={{ animationDelay: `${i * 0.08}s` }}
            />
            <span className="h-1 flex-1 bg-ink-line">
              <span
                className="block h-full bg-paper/[0.07] motion-safe:animate-pulse"
                style={{ width: "40%", animationDelay: `${0.1 + i * 0.08}s` }}
              />
            </span>
            <span className="w-16 shrink-0 text-right">
              <span className="label text-transparent">—</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Header account slot while auth resolves. */
export function AccountSlotSkeleton() {
  return (
    <span className="label text-muted/50" role="status" aria-busy="true">
      <span className="sr-only">Loading account…</span>
      <span
        aria-hidden="true"
        className="inline-block h-3 w-14 bg-paper/20 motion-safe:animate-pulse"
      />
    </span>
  );
}
