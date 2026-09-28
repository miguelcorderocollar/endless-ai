import { describe, expect, it } from "vitest";

import { difficultyRating, scoreAnswer, tierFor } from "./elo";

describe("elo", () => {
  it("maps difficulty to the documented question ratings", () => {
    expect([1, 2, 3, 4, 5].map(difficultyRating)).toEqual([800, 1000, 1200, 1400, 1600]);
  });

  it("rewards hard wins more than easy wins", () => {
    const easy = scoreAnswer(1000, 1, true);
    const hard = scoreAnswer(1000, 5, true);
    expect(hard.delta).toBeGreaterThan(easy.delta);
    expect(hard.rating).toBeGreaterThan(easy.rating);
  });

  it("punishes easy misses more than hard misses", () => {
    const easy = scoreAnswer(1000, 1, false);
    const hard = scoreAnswer(1000, 5, false);
    expect(easy.delta).toBeLessThan(hard.delta);
  });

  it("never drops below zero", () => {
    expect(scoreAnswer(0, 1, false).rating).toBe(0);
  });

  it("maps ratings to tiers", () => {
    expect(tierFor(0)).toBe("Curious");
    expect(tierFor(1000)).toBe("Prompt");
    expect(tierFor(1799)).toBe("Reasoner");
    expect(tierFor(1800)).toBe("Post-Singularity");
  });
});
