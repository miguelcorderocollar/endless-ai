import { describe, expect, it } from "vitest";

import { drawLocal, localBank, localBankSize } from "./localBank";
import { CATEGORY_KEYS } from "@shared/lib/questions/schema";

/**
 * The bank that ships inside the APK, and the offline draw it feeds.
 *
 * The generated asset is committed, so these are the tests that would notice if
 * it were committed in a broken state — a half-written file, a bundle of
 * drafts, a row that no longer satisfies `questionSchema`. They cannot notice
 * staleness against `content/questions`; `npm run validate` does that, and fails
 * the build rather than this suite.
 *
 * The offline draw is checked for the three rules the server also obeys, because
 * a fallback that quietly diverges is worse than no fallback: the player would
 * see different questions online and offline with nothing to explain why.
 */
describe("localBank", () => {
  it("parses every row through the shared schema", () => {
    const bank = localBank();
    expect(bank.length).toBeGreaterThan(100);
    expect(localBankSize()).toBe(bank.length);
    // The categories come out narrowed to the schema's keys, which is only true
    // if every row parsed.
    const unknown = bank.filter((q) => !CATEGORY_KEYS.includes(q.category));
    expect(unknown).toEqual([]);
  });

  it("holds published questions only", () => {
    expect(localBank().filter((q) => q.status !== "published")).toEqual([]);
  });

  it("is in a stable order, so a session is reproducible", () => {
    const first = localBank().map((q) => q.id);
    expect(localBank().map((q) => q.id)).toEqual(first);
  });
});

describe("drawLocal", () => {
  it("never returns something already seen", () => {
    const seen = new Set(localBank().slice(0, 50).map((q) => q.id));
    const page = drawLocal({
      seen,
      categories: new Set(),
      ratingHint: 1000,
      count: 20,
    });
    expect(page).toHaveLength(20);
    expect(page.some((q) => seen.has(q.id))).toBe(false);
  });

  it("honours the category filter, the way the server draw does", () => {
    const page = drawLocal({
      seen: new Set(),
      categories: new Set(["history"]),
      ratingHint: 1000,
      count: 50,
    });
    expect(page.length).toBeGreaterThan(0);
    expect(page.every((q) => q.category === "history")).toBe(true);
  });

  it("returns nothing rather than repeating itself when the bank is spent", () => {
    const seen = new Set(localBank().map((q) => q.id));
    expect(
      drawLocal({ seen, categories: new Set(), ratingHint: 1000, count: 20 }),
    ).toEqual([]);
  });

  it("biases toward the player's rating, so a low-Elo run is not all hard", () => {
    const easy = drawLocal({
      seen: new Set(),
      categories: new Set(),
      ratingHint: 700,
      count: 40,
    });
    const hard = drawLocal({
      seen: new Set(),
      categories: new Set(),
      ratingHint: 2200,
      count: 40,
    });
    const mean = (rows: typeof easy) =>
      rows.reduce((sum, q) => sum + q.difficulty, 0) / Math.max(1, rows.length);
    // Same sampler as `questions:draw`, so the same behaviour: a high rating
    // pulls harder questions. Sampled, not asserted exactly — the point is the
    // direction and a margin, not a fixed draw.
    expect(mean(hard)).toBeGreaterThan(mean(easy));
  });
});
