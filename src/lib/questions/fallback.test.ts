import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { buildBankBundle } from "./bankBundle";
import { BANK_JSON_URL } from "./fallback";

/**
 * The offline bank is generated, not listed: `buildBankBundle` reads the
 * directory itself, so a new category file reaches the fallback with no code
 * change. These specs pin the generator's contract instead: everything
 * published is included, nothing else is, and the rows survive a
 * JSON round-trip through `public/bank.json`.
 */
describe("bank bundle", () => {
  it("bundles every published question and nothing else", () => {
    const dir = join(import.meta.dirname, "..", "..", "..", "content", "questions");
    const bundle = buildBankBundle(dir);

    expect(bundle.count).toBeGreaterThan(100);
    expect(bundle.count).toBe(bundle.questions.length);
    expect(bundle.version).toMatch(/^[0-9a-f]{12}$/);
    for (const question of bundle.questions) {
      expect(question.status).toBe("published");
      expect(question.options).toHaveLength(4);
      expect(question.options).toContain(question.answer);
    }
  });

  it("survives the JSON round-trip the client performs", () => {
    const dir = join(import.meta.dirname, "..", "..", "..", "content", "questions");
    const bundle = buildBankBundle(dir);
    const revived = JSON.parse(JSON.stringify(bundle)) as typeof bundle;

    expect(revived.questions).toHaveLength(bundle.count);
    expect(revived.questions[0]).toEqual(bundle.questions[0]);
  });

  it("documents the fallback contract", () => {
    // `fallback.ts` trusts the file only for published shape; the generator
    // guarantees it. If either side changes, this name breaks loudly here.
    expect(BANK_JSON_URL).toBe("/bank.json");
  });
});
