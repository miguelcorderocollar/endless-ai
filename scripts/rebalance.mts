/**
 * Spreads correct answers evenly across the four option slots.
 *
 * The relative order of a question's options is preserved, only rotated, so a
 * rebalance never changes what a question looks like beyond which slot is correct.
 * Run it after adding a batch and read the diff before committing.
 */
import { readFileSync, readdirSync, writeFileSync } from "fs";
import { join } from "path";

const DIR = join(process.cwd(), "content", "questions");
const write = process.argv.includes("--write");

const rotate = <T,>(items: T[], from: number, to: number): T[] => {
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved!);
  return next;
};

let moved = 0;
let total = 0;

type BankQuestion = {
  id: string;
  options: string[];
  answer: string;
  [key: string]: unknown;
};

for (const file of readdirSync(DIR).filter((f) => f.endsWith(".json")).sort()) {
  const path = join(DIR, file);
  const questions = JSON.parse(readFileSync(path, "utf8")) as BankQuestion[];

  const updated = questions.map((q: BankQuestion, index: number) => {
    total += 1;
    const current = q.options.indexOf(q.answer);
    if (current < 0) {
      throw new Error(`${q.id}: answer "${q.answer}" is not one of the options`);
    }
    const target = index % 4;
    if (current === target) return q;
    moved += 1;
    return { ...q, options: rotate(q.options, current, target) };
  });

  if (write && moved > 0) {
    writeFileSync(path, `${JSON.stringify(updated, null, 2)}\n`);
  }
}

console.log(`${write ? "Rebalanced" : "Would rebalance"} ${moved} of ${total} questions.`);
console.log(`Run with --write to apply. Target distribution over ${total} questions:`);
for (let slot = 0; slot < 4; slot++) {
  console.log(`  ${"ABCD"[slot]}  ${Math.round(total / 4)}`);
}
