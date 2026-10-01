import { describe, expect, it } from "vitest";

import { parseBankFile } from "@/lib/questions/bankFile";
import { questionSchema } from "@/lib/questions/schema";

/**
 * The one reader for a bundled bank, shared by the web's offline fallback and
 * the native app's baked-in asset.
 *
 * The test that matters here is the last one. Both bundles are generated, so a
 * corrupt row can only appear through a hand-edit, a bad merge, or a truncated
 * file — and the failure mode without a schema check is a crash on a question
 * screen, several frames from the cause. Dropping the row is invisible at 272
 * questions; crashing is not.
 */
const good = questionSchema.parse({
  id: "con-9001",
  text: "What does the acronym GPU stand for in graphics hardware?",
  options: [
    "General purpose unit",
    "Graphical processing unit",
    "General processing unit",
    "Graphics processing utility",
  ],
  answer: "Graphical processing unit",
  category: "concepts",
  difficulty: 2,
  explanation:
    "A GPU is a processor built for many small parallel operations rather than one large sequential one, which is why it also trains neural networks.",
  source: { kind: "none" },
  status: "published",
  addedAt: "2026-01-01",
});

describe("parseBankFile", () => {
  it("returns published rows that parse", () => {
    const parsed = parseBankFile({ questions: [good] });
    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.id).toBe("con-9001");
  });

  it("excludes drafts and reviews: only published ships", () => {
    const draft = { ...good, id: "con-9002", status: "draft" };
    const review = { ...good, id: "con-9003", status: "review" };
    const parsed = parseBankFile({ questions: [good, draft, review] });
    expect(parsed.map((q) => q.id)).toEqual(["con-9001"]);
  });

  it("drops a row the schema rejects instead of throwing", () => {
    const cases = [
      { ...good, id: "bad-id" }, // id shape
      { ...good, id: "con-9004", options: good.options.slice(0, 3) }, // option count
      { ...good, id: "con-9006", difficulty: 0 }, // difficulty range
      { ...good, id: "con-9007", explanation: "too short" }, // explanation length
      { ...good, id: "con-9008", category: "tech" }, // not a schema key
      { ...good, id: "con-9009", addedAt: "01/01/2026" }, // date shape
      { ...good, id: "con-9010", source: { kind: "blog" } }, // source kind
    ];
    const parsed = parseBankFile({ questions: [good, ...cases] });
    expect(parsed.map((q) => q.id)).toEqual(["con-9001"]);
  });

  it("keeps an answer outside the options, because the schema never checked", () => {
    // Worth being explicit about, because "the bundle is validated" sounds
    // stronger than it is. `questionSchema` is a *shape*: it guarantees four
    // options, a numeric difficulty, a known category. Whether the answer is
    // one of the options, or whether a distractor is too easy, is content
    // policy and lives in `npm run validate`. Both gates run in this repo
    // before either bundle is written, so a bundle in the wild has been
    // through both — but this function is the second gate, not the only one.
    const parsed = parseBankFile({
      questions: [{ ...good, id: "con-9011", answer: "None of these" }],
    });
    expect(parsed.map((q) => q.id)).toEqual(["con-9011"]);
  });

  it("degrades to an empty bank rather than throwing on a mangled file", () => {
    for (const file of [null, undefined, {}, { questions: "nope" }, { questions: null }, 7]) {
      expect(parseBankFile(file)).toEqual([]);
    }
  });

  it("keeps the order it was given, so the bundle is a stable file", () => {
    const a = { ...good, id: "con-9010" };
    const b = { ...good, id: "con-9009" };
    expect(parseBankFile({ questions: [a, b] }).map((q) => q.id)).toEqual([
      "con-9010",
      "con-9009",
    ]);
  });
});
