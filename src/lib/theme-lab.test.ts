import { describe, expect, it } from "vitest";

import { COLOR_OPTIONS, isErrorDistinct } from "./theme-lab";

describe("theme-lab error distinctness", () => {
  it("flags the reported quotes-theme pair (peach signal, tomato fail)", () => {
    expect(isErrorDistinct("#ff8561", "#ff6a4d")).toBe(false);
  });

  it("flags the reported mono-theme pair (gray signal, gray fail)", () => {
    expect(isErrorDistinct("#8d8d8d", "#a4a4a4")).toBe(false);
  });

  it("keeps every shipped theme's fail unmistakable next to its signal", () => {
    for (const theme of COLOR_OPTIONS) {
      expect(
        { theme: theme.id, signal: theme.signal, fail: theme.fail },
        `fail too close to signal in ${theme.id}`,
      ).toSatisfy(
        ({ signal, fail }: { signal: string; fail: string }) =>
          isErrorDistinct(signal, fail),
      );
    }
  });
});
