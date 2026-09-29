import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { questionSchema, type Question } from "./schema";

/**
 * Generates `public/bank.json`: the whole validated content bank in one
 * stable-URL file, so the service worker can precache it by name and the
 * offline fallback (`fallback.ts`) can fetch it. Hashed `/_next/static`
 * chunks cannot do this job — their names are unknowable until after the
 * build, and the fallback is only ever needed on a device that never fetched
 * them while online.
 *
 * Node-only: uses `fs` and `crypto`, so it must never be imported by client
 * code. Called from `next.config.ts` on every build and dev boot, which keeps
 * the file fresh without a manual step and without committing a generated
 * artifact (`public/bank.json` is gitignored). Draft and review rows are
 * excluded; the file holds published questions only.
 */
export type BankBundle = {
  /** Short content hash. Reserved for a future staleness hint (#17). */
  version: string;
  count: number;
  questions: Question[];
};

export function buildBankBundle(dir: string): BankBundle {
  const hash = createHash("sha256");
  const questions: Question[] = [];
  for (const name of readdirSync(dir)
    .filter((entry) => entry.endsWith(".json"))
    .sort()) {
    const raw = readFileSync(join(dir, name), "utf8");
    hash.update(raw);
    const rows: unknown = JSON.parse(raw);
    if (!Array.isArray(rows)) continue;
    for (const row of rows) {
      const parsed = questionSchema.safeParse(row);
      if (parsed.success && parsed.data.status === "published") {
        questions.push(parsed.data);
      }
    }
  }
  return {
    version: hash.digest("hex").slice(0, 12),
    count: questions.length,
    questions,
  };
}

/** Writes the bundle where Next serves it verbatim. */
export function writeBankBundle(projectRoot: string): { path: string; count: number } {
  const bundle = buildBankBundle(join(projectRoot, "content", "questions"));
  const outPath = join(projectRoot, "public", "bank.json");
  mkdirSync(join(projectRoot, "public"), { recursive: true });
  writeFileSync(outPath, JSON.stringify(bundle));
  return { path: outPath, count: bundle.count };
}
