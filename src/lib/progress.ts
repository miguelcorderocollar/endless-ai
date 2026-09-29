export type SavedProgress = {
  rating: number;
  answered: number;
  correct: number;
  streak: number;
  lastPlayed: string;
  /** Question ids answered correctly. Failed ones reappear, so this is the done list. */
  completed: string[];
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
};

export function readProgress(): SavedProgress {
  if (typeof window === "undefined") return EMPTY_PROGRESS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY_PROGRESS;
    const parsed = JSON.parse(raw) as Partial<SavedProgress>;
    return { ...EMPTY_PROGRESS, ...parsed };
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
