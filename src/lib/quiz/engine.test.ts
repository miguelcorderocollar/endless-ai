import { describe, expect, it } from "vitest";

import type { CategoryKey, Question } from "../questions/schema";
import { matchWeight, pickNext, weightedSample } from "./engine";

/** Deterministic RNG so distribution assertions are exact, not flaky. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeBank(perDifficulty = 20): Question[] {
  const bank: Question[] = [];
  for (let d = 1; d <= 5; d++) {
    for (let i = 0; i < perDifficulty; i++) {
      bank.push({
        id: `tst-${d}${String(i).padStart(3, "0")}`,
        text: `Difficulty ${d} question ${i} with enough text here`,
        options: ["a", "b", "c", "d"],
        answer: "a",
        category: "history" as CategoryKey,
        tags: [],
        difficulty: d,
        explanation: "Test question explanation with enough length.",
        source: { kind: "none" },
        answerAliases: [],
        status: "published",
        addedAt: "2026-01-01",
      });
    }
  }
  return bank;
}

/** Draw counts per difficulty over n fresh draws (empty seen each time). */
function distribution(
  bank: Question[],
  rating: number | null,
  n: number,
  seed: number,
): number[] {
  const random = mulberry32(seed);
  const counts = [0, 0, 0, 0, 0];
  for (let i = 0; i < n; i++) {
    const q = pickNext(bank, new Set(), new Set(), random, rating);
    const d = q!.difficulty - 1;
    counts[d] = (counts[d] ?? 0) + 1;
  }
  return counts as [number, number, number, number, number];
}

describe("elo-matched draw (#32)", () => {
  it("weights peak at the question rating closest to the player", () => {
    expect(matchWeight(1, 800)).toBeCloseTo(1, 5);
    expect(matchWeight(1, 800)).toBeGreaterThan(matchWeight(2, 800));
    expect(matchWeight(5, 1600)).toBeGreaterThan(matchWeight(4, 1600));
  });

  it("deals mostly difficulty 1-2 to a new player", () => {
    const counts = distribution(makeBank(), 900, 300, 42);
    expect(counts[0]! + counts[1]!).toBeGreaterThanOrEqual(165);
  });

  it("deals mostly difficulty 4-5 to an expert", () => {
    const counts = distribution(makeBank(), 1600, 300, 42);
    expect(counts[3]! + counts[4]!).toBeGreaterThanOrEqual(165);
  });

  it("deals mostly difficulty 2-4 to a mid player", () => {
    const counts = distribution(makeBank(), 1200, 300, 42);
    expect(counts[1]! + counts[2]! + counts[3]!).toBeGreaterThanOrEqual(165);
  });

  it("keeps an exploration floor: off-level questions still surface", () => {
    const low = distribution(makeBank(), 900, 300, 42);
    expect(low[4]).toBeGreaterThanOrEqual(3);
    const high = distribution(makeBank(), 1600, 300, 7);
    expect(high[0]! + high[1]!).toBeGreaterThanOrEqual(3);
  });

  it("stays uniform with a null rating (guests, old behavior)", () => {
    const counts = distribution(makeBank(), null, 300, 42);
    for (const c of counts) {
      expect(c).toBeGreaterThanOrEqual(30);
      expect(c).toBeLessThanOrEqual(90);
    }
  });

  it("still honors seen, categories, and exhaustion", () => {
    const bank = makeBank(2);
    const seen = new Set(bank.map((q) => q.id));
    expect(pickNext(bank, seen, new Set(), mulberry32(1), 1000)).toBeNull();
    const other = pickNext(
      bank,
      new Set(),
      new Set(["history"] as CategoryKey[]),
      mulberry32(1),
      1000,
    );
    expect(other).not.toBeNull();
    const none = pickNext(
      bank,
      new Set(),
      new Set(["memes"] as CategoryKey[]),
      mulberry32(1),
      1000,
    );
    expect(none).toBeNull();
  });
});

describe("weightedSample", () => {
  it("samples without replacement and caps at pool size", () => {
    const items = ["a", "b", "c"];
    const out = weightedSample(items, [1, 1, 1], 5, mulberry32(3));
    expect(out).toHaveLength(3);
    expect(new Set(out).size).toBe(3);
  });

  it("falls back to uniform on all-zero weights", () => {
    const out = weightedSample(["a", "b"], [0, 0], 2, mulberry32(3));
    expect(out).toHaveLength(2);
  });

  it("favors heavy weights deterministically", () => {
    const out = weightedSample(["a", "b"], [1000, 1], 1, mulberry32(3));
    expect(out).toEqual(["a"]);
  });
});
