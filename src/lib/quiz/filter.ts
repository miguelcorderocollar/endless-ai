const KEY = "endless-ai:filter:v1";

/** Category filter for fun-mode play (#12). Empty = whole bank. */
export function readFilter(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((c) => typeof c === "string") : [];
  } catch {
    return [];
  }
}

export function writeFilter(categories: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(categories));
  } catch {
    /* filter is a nicety, not a requirement */
  }
}
