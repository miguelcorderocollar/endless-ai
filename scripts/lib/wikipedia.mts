import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { createHash } from "crypto";

const CACHE_DIR = join(process.cwd(), "scripts", ".cache", "wikipedia");
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const API = "https://en.wikipedia.org/w/api.php";
const USER_AGENT = "EndlessAI-QuestionValidator/0.1 (content QA)";

/** Wikipedia refuses exlimit above 1 for whole article extracts, so lead sections batch and bodies do not. */
export const INTRO_BATCH_SIZE = 20;

type CacheEntry = {
  fetchedAt: string;
  title: string;
  intro: string;
  text?: string;
  textFetchedAt?: string;
};

const cachePath = (title: string) =>
  join(CACHE_DIR, `${createHash("sha1").update(title).digest("hex")}.json`);

function readCache(title: string): CacheEntry | null {
  const path = cachePath(title);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as CacheEntry;
  } catch {
    return null;
  }
}

function writeCache(title: string, entry: CacheEntry) {
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(cachePath(title), JSON.stringify(entry));
}

type WikiApiResponse = {
  query?: {
    redirects?: Array<{ from: string; to: string }>;
    normalized?: Array<{ from: string; to: string }>;
    pages?: Array<{ title: string; missing?: string; extract?: string }>;
  };
} | null;

async function request(url: string): Promise<WikiApiResponse> {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
      const body = await res.text();
      if (body.trimStart().startsWith("{")) return JSON.parse(body) as WikiApiResponse;
    } catch {
      /* fall through to backoff */
    }
    await new Promise((r) => setTimeout(r, 800 * 2 ** attempt));
  }
  return null;
}

const DISAMBIGUATION = /^(disambiguation|list of|index of|outline of|timeline of|glossary of)/i;
const DISAMBIGUATION_BODY = /^[^.!?]{0,120}\bmay refer to\b/i;

function isDisambiguation(title: string, extract: string): boolean {
  return DISAMBIGUATION.test(title) || DISAMBIGUATION_BODY.test(extract.trim());
}

function classify(title: string, extract: string | null) {
  if (extract === null) return { reason: `no wikipedia article titled "${title}"` };
  if (isDisambiguation(title, extract)) {
    return { reason: `"${title}" is a disambiguation or list page, not an article about a subject` };
  }
  if (extract.trim().length < 80) {
    return { reason: `article "${title}" has no usable text` };
  }
  return null;
}

/** Fetches lead sections for many titles at once. Cheap, and it backs the strong grounding check. */
export async function resolveIntros(
  titles: string[],
  offline = false,
): Promise<Map<string, WikiIntroResult>> {
  const out = new Map<string, WikiIntroResult>();
  const pending: string[] = [];

  for (const title of titles) {
    const cached = readCache(title);
    if (cached && Date.now() - Date.parse(cached.fetchedAt) < CACHE_TTL_MS) {
      out.set(title, {
        ok: true,
        title: cached.title,
        intro: cached.intro,
      });
    } else {
      pending.push(title);
    }
  }

  if (offline) {
    for (const title of pending) {
      const cached = readCache(title);
      out.set(
        title,
        cached
          ? { ok: true, title: cached.title, intro: cached.intro }
          : { ok: false, reason: "not checked (offline mode)" },
      );
    }
    return out;
  }

  for (let i = 0; i < pending.length; i += INTRO_BATCH_SIZE) {
    const batch = pending.slice(i, i + INTRO_BATCH_SIZE);
    const url = `${API}?action=query&format=json&formatversion=2&redirects=1&prop=extracts&explaintext=1&exintro=1&exlimit=20&titles=${encodeURIComponent(batch.join("|"))}`;
    const data = await request(url);

    if (!data) {
      for (const title of batch) {
        out.set(title, { ok: false, reason: "wikipedia api unreachable" });
      }
      continue;
    }

    const canonical = new Map<string, string>();
    for (const r of [...(data.query?.redirects ?? []), ...(data.query?.normalized ?? [])]) {
      canonical.set(r.from, r.to);
    }
    const byTitle = new Map<string, string | null>();
    for (const page of data.query?.pages ?? []) {
      byTitle.set(page.title, page.missing !== undefined ? null : (page.extract ?? ""));
    }

    for (const original of batch) {
      const finalTitle = canonical.get(original) ?? original;
      const extract = byTitle.get(finalTitle);

      if (extract === undefined) {
        out.set(original, { ok: false, reason: "wikipedia api returned no entry" });
        continue;
      }

      const problem = classify(finalTitle, extract);
      if (problem) {
        out.set(original, { ok: false, reason: problem.reason });
        continue;
      }

      const existing = readCache(original);
      writeCache(original, {
        fetchedAt: new Date().toISOString(),
        title: finalTitle,
        intro: extract!,
        ...(existing?.text ? { text: existing.text, textFetchedAt: existing.textFetchedAt } : {}),
      });
      out.set(original, { ok: true, title: finalTitle, intro: extract! });
    }
  }

  return out;
}

/** Fetches the whole article for one title. Only used to soften an intro miss into a warning. */
export async function fetchFullText(
  title: string,
): Promise<string | null> {
  const cached = readCache(title);
  if (cached?.text && Date.now() - Date.parse(cached.textFetchedAt ?? cached.fetchedAt) < CACHE_TTL_MS) {
    return cached.text;
  }

  const url = `${API}?action=query&format=json&formatversion=2&redirects=1&prop=extracts&explaintext=1&titles=${encodeURIComponent(title)}`;
  const data = await request(url);
  if (!data) return null;

  const page = (data.query?.pages ?? [])[0];
  const extract = page?.missing !== undefined ? null : (page?.extract ?? null);
  if (!extract) return null;

  const entry: CacheEntry = cached ?? {
    fetchedAt: new Date().toISOString(),
    title: page.title,
    intro: extract.slice(0, 1800),
  };
  entry.text = extract;
  entry.textFetchedAt = new Date().toISOString();
  writeCache(title, entry);
  return extract;
}
