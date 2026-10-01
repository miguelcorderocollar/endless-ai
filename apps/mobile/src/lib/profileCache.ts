import AsyncStorage from "@react-native-async-storage/async-storage";

import type { Question } from "@shared/lib/questions/schema";

/**
 * The native `bankCache`: the async-store snapshot that keeps repeat visits
 * instant, and stops a cold offline launch from having nothing to show.
 *
 * The web keeps this in localStorage and reads it during render
 * (`src/lib/quiz/bankCache.ts`). There is no synchronous store here, so the
 * pattern is inverted: every read returns a module-level mirror, and the root
 * layout awaits `hydrateCaches()` once on mount — the same job as the web's
 * `readListCache()` in a layout effect, and the reason a returning player sees
 * their done list instead of a spinner.
 *
 * Three things are cached, and they are the three that were actually loading
 * screens: the published list (the done list), the category counts (the picker,
 * so its rows render before the query lands), and the last signed-in identity
 * (the masthead, and the outbox's drain attribution, which needs a handle the
 * instant you answer).
 */
const LIST_KEY = "endless-ai:bank-list:v1";
const COUNTS_KEY = "endless-ai:counts:v1";
const PROFILE_KEY = "endless-ai:profile:v1";

export type CategoryCount = { category: string; count: number };

export type CachedProfile = {
  displayName: string | null;
  handle: string | null;
  role: string;
  isAnonymous: boolean;
};

let list: Question[] | null = null;
let counts: CategoryCount[] | null = null;
let profile: CachedProfile | null = null;
let hydrated = false;

const listeners = new Set<() => void>();

export function subscribeCaches(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notify(): void {
  for (const listener of listeners) listener();
}

function sanitizeProfile(value: object): CachedProfile {
  const raw = value as Record<string, unknown>;
  return {
    displayName: typeof raw.displayName === "string" ? raw.displayName : null,
    handle: typeof raw.handle === "string" ? raw.handle : null,
    role: typeof raw.role === "string" ? raw.role : "user",
    isAnonymous: raw.isAnonymous === true,
  };
}

function readRows(value: unknown): Question[] | null {
  const questions = (value as { questions?: unknown })?.questions;
  return Array.isArray(questions) && questions.length > 0
    ? (questions as Question[])
    : null;
}

/**
 * One async read of all three keys, awaited once. Until it resolves the mirrors
 * are null, so a screen shows its loading state rather than a wrong "0". The
 * caller does not need to await it: the `notify()` at the end re-renders
 * whatever subscribed.
 */
export async function hydrateCaches(): Promise<void> {
  const [rawList, rawCounts, rawProfile] = await Promise.all([
    AsyncStorage.getItem(LIST_KEY).catch(() => null),
    AsyncStorage.getItem(COUNTS_KEY).catch(() => null),
    AsyncStorage.getItem(PROFILE_KEY).catch(() => null),
  ]);

  try {
    list = rawList ? readRows(JSON.parse(rawList)) : null;
  } catch {
    list = null;
  }
  try {
    const rows = rawCounts
      ? (JSON.parse(rawCounts) as { counts?: unknown }).counts
      : null;
    counts =
      Array.isArray(rows) && rows.length > 0 ? (rows as CategoryCount[]) : null;
  } catch {
    counts = null;
  }
  try {
    profile = rawProfile ? sanitizeProfile(JSON.parse(rawProfile)) : null;
  } catch {
    profile = null;
  }

  hydrated = true;
  notify();
}

export function hasHydratedCaches(): boolean {
  return hydrated;
}

/** The published list, or null until it has been read or fetched. */
export function readListCache(): Question[] | null {
  return list;
}

export function writeListCache(questions: Question[]): void {
  if (questions.length === 0) return;
  list = questions;
  void AsyncStorage.setItem(LIST_KEY, JSON.stringify({ questions })).catch(
    () => {},
  );
  notify();
}

export function readCountsCache(): CategoryCount[] | null {
  return counts;
}

export function writeCountsCache(rows: CategoryCount[]): void {
  if (rows.length === 0) return;
  counts = rows;
  void AsyncStorage.setItem(COUNTS_KEY, JSON.stringify({ counts })).catch(
    () => {},
  );
  notify();
}

/** The last signed-in identity, for the masthead and the outbox's account tag. */
export function readProfileCache(): CachedProfile | null {
  return profile;
}

export function writeProfileCache(next: CachedProfile): void {
  profile = next;
  void AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(next)).catch(() => {});
  notify();
}

/** On sign-out, so a guest never sees the previous account's name. */
export function clearProfileCache(): void {
  profile = null;
  void AsyncStorage.removeItem(PROFILE_KEY).catch(() => {});
  notify();
}
