import AsyncStorage from "@react-native-async-storage/async-storage";

import { RECENT_CAP, type SavedProgress } from "@shared/lib/progress";

/**
 * Progress storage for the native app. The web app keeps this in localStorage
 * behind a `typeof window` guard (`src/lib/progress.ts`); there is no `window`
 * here and no synchronous storage to guard against, so the shape is mirrored
 * onto AsyncStorage and only the persistence differs.
 *
 * The *type* is imported from the web module rather than restated. That is the
 * point of the shared lib: a field added on one side is a type error on the
 * other, which is how the two stores stop drifting. `import type` means nothing
 * from that module runs here, so its localStorage code never executes.
 *
 * Offline answer queuing (#17 on the web) is deliberately not here yet — the
 * native outbox needs its own AsyncStorage-backed queue and exact-replay
 * semantics, and it is a second pass. Until then a lost connection drops the
 * sync, not the local rating, which is the same degradation the PWA had before
 * PR #43.
 */
const PROGRESS_KEY = "endless-ai:progress:v1";
const FILTER_KEY = "endless-ai:filter:v1";

/** Mirrors `EMPTY_PROGRESS` on the web, including the 1000 starting rating. */
export const EMPTY_PROGRESS: SavedProgress = {
  rating: 1000,
  answered: 0,
  correct: 0,
  streak: 1,
  lastPlayed: "",
  completed: [],
  recent: [],
};

function sanitizeRecent(value: unknown): SavedProgress["recent"] {
  if (!Array.isArray(value)) return [];
  const out: SavedProgress["recent"] = [];
  for (const entry of value) {
    if (
      typeof entry === "object" &&
      entry !== null &&
      typeof (entry as { id?: unknown }).id === "string" &&
      typeof (entry as { correct?: unknown }).correct === "boolean"
    ) {
      out.push({
        id: (entry as { id: string }).id,
        correct: (entry as { correct: boolean }).correct,
        at:
          typeof (entry as { at?: unknown }).at === "number"
            ? (entry as { at: number }).at
            : 0,
      });
    }
  }
  return out.slice(-RECENT_CAP);
}

export function parseProgress(raw: string | null): SavedProgress {
  if (!raw) return EMPTY_PROGRESS;
  try {
    const parsed = JSON.parse(raw) as Partial<SavedProgress>;
    return { ...EMPTY_PROGRESS, ...parsed, recent: sanitizeRecent(parsed.recent) };
  } catch {
    return EMPTY_PROGRESS;
  }
}

export async function readProgress(): Promise<SavedProgress> {
  try {
    return parseProgress(await AsyncStorage.getItem(PROGRESS_KEY));
  } catch {
    return EMPTY_PROGRESS;
  }
}

export async function readFilter(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(FILTER_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((c) => typeof c === "string") : [];
  } catch {
    return [];
  }
}

export async function writeFilter(categories: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(FILTER_KEY, JSON.stringify(categories));
  } catch {
    /* filter is a nicety, not a requirement */
  }
}

/**
 * Subscribable store, mirroring the web's `useSyncExternalStore` cache so the
 * Elo masthead and the profile headline read the same value the quiz writes.
 * `getSnapshot` is a cache slot, not the value itself, so a rebuild that
 * returns a fresh object every call would spin `useSyncExternalStore` forever.
 */
let cached: SavedProgress | null = null;
let filterCached: string[] | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

export function subscribeProgress(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getProgress(): SavedProgress {
  if (cached === null) cached = EMPTY_PROGRESS;
  return cached;
}

export function getFilter(): string[] {
  if (filterCached === null) filterCached = [];
  return filterCached;
}

export function hasHydrated(): boolean {
  return cached !== null || filterCached !== null;
}

/** Loads both keys once on mount. Same job as the web's `hydrateProgress`. */
export async function hydrateProgress(): Promise<void> {
  const [progress, filter] = await Promise.all([readProgress(), readFilter()]);
  cached = progress;
  filterCached = filter;
  notify();
}

/**
 * Optimistic write, like the web: the rating moves the instant you answer and
 * the store is not re-read. The await is fire-and-forget because a failed
 * write costs you history, not the answer you just gave.
 */
export function updateProgress(next: SavedProgress): void {
  cached = next;
  notify();
  void AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(next)).catch(() => {});
}

export function updateFilter(categories: string[]): void {
  filterCached = categories;
  notify();
  void writeFilter(categories);
}
