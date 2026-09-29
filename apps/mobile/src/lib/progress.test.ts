import { describe, expect, it, vi } from "vitest";

// AsyncStorage is a native module and cannot load in this runner. The specs
// below only touch `parseProgress`, which is pure and sits above every
// AsyncStorage call, so a stub is enough to let the module import.
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async () => null),
    setItem: vi.fn(async () => undefined),
  },
}));

import { EMPTY_PROGRESS, parseProgress } from "./progress";

/**
 * Progress is read back out of AsyncStorage on every launch, so `parseProgress`
 * is the one function in the native app that has to survive whatever is in
 * there: a first run with nothing written, a half-written value, a shape from an
 * older build. The web app has the same guard inline in `readProgress`; this is
 * the copy that has to behave the same way, and it is the only reason the mobile
 * package is reachable from the root test runner.
 */
describe("parseProgress", () => {
  it("returns the empty progress when nothing is stored", () => {
    expect(parseProgress(null)).toEqual(EMPTY_PROGRESS);
    expect(parseProgress("")).toEqual(EMPTY_PROGRESS);
  });

  it("falls back to the empty progress on unparseable JSON", () => {
    // A truncated write must not wedge the app on a blank screen forever.
    expect(parseProgress("{not json")).toEqual(EMPTY_PROGRESS);
  });

  it("fills in missing fields from a partial record", () => {
    const parsed = parseProgress(JSON.stringify({ rating: 1240, answered: 9 }));
    expect(parsed.rating).toBe(1240);
    expect(parsed.answered).toBe(9);
    // Everything absent comes from the empty record, not from undefined.
    expect(parsed.completed).toEqual([]);
    expect(parsed.recent).toEqual([]);
    expect(parsed.streak).toBe(EMPTY_PROGRESS.streak);
  });

  it("drops recent entries that are not answer records", () => {
    const parsed = parseProgress(
      JSON.stringify({
        recent: [
          { id: "mod-0001", correct: true, at: 111 },
          { id: 42, correct: true, at: 1 },
          { id: "mod-0002", correct: "yes", at: 2 },
          null,
          { correct: false, at: 3 },
          { id: "mod-0003", correct: false },
        ],
      }),
    );
    // The valid entry survives, the one with no id is dropped, and the
    // missing `at` defaults to 0 rather than becoming undefined.
    expect(parsed.recent).toEqual([
      { id: "mod-0001", correct: true, at: 111 },
      { id: "mod-0003", correct: false, at: 0 },
    ]);
  });

  it("caps the recent buffer at the web app's limit", () => {
    const recent = Array.from({ length: 400 }, (_, i) => ({
      id: `mod-${String(i).padStart(4, "0")}`,
      correct: i % 2 === 0,
      at: i,
    }));
    const parsed = parseProgress(JSON.stringify({ recent }));
    expect(parsed.recent).toHaveLength(100);
    // Newest-last ring buffer: the tail is what survives, so a just-answered
    // question is still there and the oldest is the one dropped.
    expect(parsed.recent.at(-1)?.id).toBe("mod-0399");
    expect(parsed.recent[0]?.id).toBe("mod-0300");
  });

  it("ignores a non-array recent value", () => {
    expect(parseProgress(JSON.stringify({ recent: "nope" })).recent).toEqual([]);
  });
});
