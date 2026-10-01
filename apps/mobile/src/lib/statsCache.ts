import AsyncStorage from "@react-native-async-storage/async-storage";

import type { HistoryPoint, Population } from "./api";

/**
 * The stats snapshot that makes the profile instant on revisit. `history` and
 * `population` are the two queries the chart tabs are built from, and without
 * this every visit re-fetches both: the panel goes black, then the chart pops
 * in a beat later. With it the last values paint on the first frame and the
 * live queries revalidate silently behind them — stale-while-revalidate, the
 * same pattern `profileCache.ts` uses for the bank list.
 *
 * Same shape as the other mirrors: module-level values, a subscription for
 * re-renders, one `hydrate` the root layout awaits, and write-through when a
 * query resolves. The result types come from `api.ts`, so a field added
 * server-side breaks this file at typecheck time instead of dropping quietly.
 */
const HISTORY_KEY = "endless-ai:stats-history:v1";
const POPULATION_KEY = "endless-ai:stats-population:v1";

let history: HistoryPoint[] | null = null;
let population: Population | null = null;

const listeners = new Set<() => void>();

export function subscribeStats(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notify(): void {
  for (const listener of listeners) listener();
}

function sanitizeHistory(value: unknown): HistoryPoint[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const out: HistoryPoint[] = [];
  for (const entry of value) {
    if (
      typeof entry === "object" &&
      entry !== null &&
      typeof (entry as { t?: unknown }).t === "number" &&
      typeof (entry as { r?: unknown }).r === "number"
    ) {
      out.push({
        t: (entry as { t: number }).t,
        r: (entry as { r: number }).r,
      });
    }
  }
  return out.length > 0 ? out : null;
}

function sanitizePopulation(value: unknown): Population | null {
  if (typeof value !== "object" || value === null) return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.count !== "number" || !Array.isArray(raw.buckets)) return null;
  const buckets = raw.buckets.filter(
    (b): b is number => typeof b === "number",
  );
  if (buckets.length === 0) return null;
  return {
    count: raw.count,
    median: typeof raw.median === "number" ? raw.median : null,
    buckets,
    percentile: typeof raw.percentile === "number" ? raw.percentile : null,
    capped: raw.capped === true,
  };
}

/** Awaited once by the root layout, next to the other hydrates. */
export async function hydrateStatsCaches(): Promise<void> {
  const [rawHistory, rawPopulation] = await Promise.all([
    AsyncStorage.getItem(HISTORY_KEY).catch(() => null),
    AsyncStorage.getItem(POPULATION_KEY).catch(() => null),
  ]);
  try {
    history = rawHistory ? sanitizeHistory(JSON.parse(rawHistory)) : null;
  } catch {
    history = null;
  }
  try {
    population = rawPopulation
      ? sanitizePopulation(JSON.parse(rawPopulation))
      : null;
  } catch {
    population = null;
  }
  notify();
}

/** The last rating series, or null until a query has resolved once. */
export function readHistory(): HistoryPoint[] | null {
  return history;
}

export function writeHistory(points: HistoryPoint[]): void {
  if (points.length === 0) return;
  history = points;
  void AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(points)).catch(
    () => {},
  );
  notify();
}

/** The last population snapshot, or null until a query has resolved once. */
export function readPopulation(): Population | null {
  return population;
}

export function writePopulation(next: Population): void {
  population = next;
  void AsyncStorage.setItem(POPULATION_KEY, JSON.stringify(next)).catch(
    () => {},
  );
  notify();
}

/**
 * Forgets both mirrors, on disk too. Called on sign-out: the history belongs
 * to whoever just signed out, and a guest must never see it.
 */
export function clearStatsCaches(): void {
  history = null;
  population = null;
  void AsyncStorage.multiRemove([HISTORY_KEY, POPULATION_KEY]).catch(() => {});
  notify();
}
