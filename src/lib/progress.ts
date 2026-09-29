export type RecentAnswer = {
  id: string;
  correct: boolean;
  at: number;
};

/** Cap: enough for the profile misses list, small enough for localStorage. */
export const RECENT_CAP = 100;

export type SavedProgress = {
  rating: number;
  answered: number;
  correct: number;
  streak: number;
  lastPlayed: string;
  /** Question ids answered correctly. Failed ones reappear, so this is the done list. */
  completed: string[];
  /** Newest-last ring buffer of recent attempts (both verdicts). Drives the profile misses list. */
  recent: RecentAnswer[];
};

/**
 * Prototype only. Progress lives in localStorage until accounts arrive in M2, at which
 * point this file is replaced by the Convex client and nothing above it changes.
 */
const KEY = "endless-ai:progress:v1";

export const EMPTY_PROGRESS: SavedProgress = {
  rating: 1000,
  answered: 0,
  correct: 0,
  streak: 1,
  lastPlayed: "",
  completed: [],
  recent: [],
};

function sanitizeRecent(value: unknown): RecentAnswer[] {
  if (!Array.isArray(value)) return [];
  const out: RecentAnswer[] = [];
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

export function readProgress(): SavedProgress {
  if (typeof window === "undefined") return EMPTY_PROGRESS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY_PROGRESS;
    const parsed = JSON.parse(raw) as Partial<SavedProgress>;
    return { ...EMPTY_PROGRESS, ...parsed, recent: sanitizeRecent(parsed.recent) };
  } catch {
    return EMPTY_PROGRESS;
  }
}

export function writeProgress(progress: SavedProgress): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(progress));
  } catch {
    /* private browsing, quota, whatever. Progress is a nicety, not a requirement. */
  }
}

let cached: SavedProgress | null = null;
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

export function getProgressSnapshot(): SavedProgress {
  // Lazy-read localStorage on first client render (#31): the Elo masthead and
  // profile headline paint the known rating instantly instead of flashing
  // EMPTY (1000) until the hydrate effect runs. Cached reference keeps
  // useSyncExternalStore stable until updateProgress notifies.
  if (typeof window !== "undefined" && !cached) {
    cached = readProgress();
  }
  return cached ?? EMPTY_PROGRESS;
}

export function getProgressServerSnapshot(): SavedProgress {
  return EMPTY_PROGRESS;
}

/** Reads localStorage once on the client. The server snapshot stays empty, so hydration matches. */
export function hydrateProgress(): void {
  if (typeof window === "undefined" || cached) return;
  cached = readProgress();
  notify();
}

export function updateProgress(next: SavedProgress): void {
  cached = next;
  writeProgress(next);
  notify();
}
