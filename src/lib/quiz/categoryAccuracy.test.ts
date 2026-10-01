import { describe, expect, it } from "vitest";

import { accuracyByCategory } from "@/lib/quiz/categoryAccuracy";

/**
 * The arithmetic behind the per-category accuracy bars, shared by the web's
 * categories page and the native one.
 *
 * The null is the whole point of this file's existence. A category you have
 * never answered is unknown, not zero, and the two render differently on both
 * screens — a dash against an empty bar. A shared helper is what stops one app
 * from quietly turning "never tried" into "0%", which is the kind of small lie
 * that makes a stats panel untrustworthy.
 */
describe("accuracyByCategory", () => {
  it("computes a rounded percentage per category", () => {
    const byCategory = accuracyByCategory([
      { category: "models", answered: 8, correct: 6 },
      { category: "history", answered: 3, correct: 1 },
    ]);
    expect(byCategory.get("models")?.pct).toBe(75);
    expect(byCategory.get("history")?.pct).toBe(33);
  });

  it("keeps a never-answered category as null, not zero", () => {
    const byCategory = accuracyByCategory([
      { category: "models", answered: 0, correct: 0 },
    ]);
    expect(byCategory.get("models")).toEqual({
      answered: 0,
      correct: 0,
      pct: null,
    });
  });

  it("is empty for a missing rollup, which is what a fresh account is", () => {
    expect(accuracyByCategory(null).size).toBe(0);
    expect(accuracyByCategory(undefined).size).toBe(0);
    expect(accuracyByCategory([]).size).toBe(0);
  });

  it("keys by the schema's category, so the screens can look up all fourteen", () => {
    const byCategory = accuracyByCategory([
      { category: "open-source", answered: 2, correct: 2 },
    ]);
    expect(byCategory.get("open-source")?.pct).toBe(100);
  });
});
