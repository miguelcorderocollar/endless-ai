/**
 * Scores the dupe threshold against data/dupe/labelled.json.
 *
 * The labelled pairs are hand-adjudicated, so this is the only precision number
 * that means anything. Hand-written ground truth was wrong twice while building
 * this tool, which is why the labels live in their own file and are re-checked
 * by a person rather than trusted from a model's output.
 *
 *   npm run dupe:score
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";

import { loadBank } from "../src/lib/questions/load";

const LABELLED = join(process.cwd(), "data", "dupe", "labelled.json");
const VERDICTS = join(process.cwd(), "data", "dupe", "verdicts.json");

type Label = {
  a: string;
  b: string;
  noul: number;
  verdict: "duplicate" | "distinct" | "related";
  note: string;
  /** Set once a human has fixed the pair. Excluded from scoring. */
  resolution?: string;
};

const { questions } = loadBank();
const byId = new Map(questions.map((q) => [q.id, q]));
if (!existsSync(LABELLED) || !existsSync(VERDICTS)) {
  console.log("run `npm run dupe` first, and keep data/dupe/labelled.json in the repo");
  process.exit(1);
}

const all = (JSON.parse(readFileSync(LABELLED, "utf8")) as { pairs: Label[] }).pairs;

// A resolved pair is one a human already fixed (reworded or deleted). It stays in
// the file as a record, but it is no longer in the bank, or no longer a
// duplicate, so scoring it again would penalise the threshold for catching
// something that has been dealt with.
const pairs = all.filter((p) => !p.resolution);
const resolved = all.filter((p) => p.resolution);

const missing = pairs.filter((p) => ![p.a, p.b].every((id) => byId.has(id)));
if (missing.length) {
  for (const p of missing) console.log(`live label references a missing id: ${p.a} / ${p.b}`);
  console.log("mark those labels with a resolution, or remove them");
  process.exit(1);
}

const dup = pairs.filter((p) => p.verdict === "duplicate");
const fp = pairs.filter((p) => p.verdict !== "duplicate");

/**
 * Recall needs unresolved duplicates, so it is only meaningful while some are
 * left. Once every confirmed duplicate has been fixed, the honest reading is
 * "nothing flagged is actually wrong", and a precision of 0% over lookalikes is
 * the tool working, not failing.
 */
if (dup.length === 0) {
  console.log("no unresolved duplicates remain, so recall is undefined and the 0%");
  console.log("precision below is against confirmed lookalikes only. Re-check the");
  console.log("threshold against a fresh batch before trusting it on new questions.\n");
}

console.log(`${questions.length} questions, ${pairs.length} live labelled pairs, ${resolved.length} resolved`);
console.log(`  ${dup.length} duplicates, ${fp.length} false positives\n`);

console.log("threshold   precision   recall     flagged");
const thresholds = [0.5, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9];
for (const t of thresholds) {
  const flagged = pairs.filter((p) => p.noul >= t);
  const hit = flagged.filter((p) => p.verdict === "duplicate").length;
  const prec = flagged.length ? hit / flagged.length : 0;
  const rec = dup.length ? hit / dup.length : 0;
  const bar = "█".repeat(Math.round(prec * 20)).padEnd(20, "·");
  console.log(
    `  ${t.toFixed(2)}     ${bar} ${String(Math.round(prec * 100)).padStart(3)}%   ` +
      `${String(Math.round(rec * 100)).padStart(3)}%      ${flagged.length}`,
  );
}

console.log("\nmissed duplicates (below every threshold, so never reported):");
const reported = pairs.filter((p) => p.noul >= 0.7);
const missed = dup.filter((p) => !reported.includes(p));
if (missed.length === 0) console.log("  none");
for (const p of missed) console.log(`  ${p.noul}  ${p.a} / ${p.b}  ${byId.get(p.a)!.text}`);

console.log("\nfalse positives reported at 0.7 (each one is a human judgement call):");
for (const p of fp.filter((x) => x.noul >= 0.7)) {
  console.log(`  ${p.noul}  ${p.a} / ${p.b}  [${p.verdict}]`);
}
