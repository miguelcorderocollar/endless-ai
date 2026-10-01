import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { type BankBundle, parseBankFile } from "./bankFile";
import type { Question } from "./schema";

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
 *
 * `writeNativeBankBundle` emits the same bytes for the Expo app, where the
 * bundle is committed instead — see the note on that function.
 */
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
    // The same schema and the same rule as every other reader of the bank: a
    // row that does not parse is a content bug the pipeline should have caught,
    // and it is dropped rather than shipped.
    questions.push(...parseBankFile({ questions: rows }));
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

/**
 * The same bundle, written where the native app can bundle it.
 *
 * The web fetches `public/bank.json` at runtime behind a stable URL. There is no
 * equivalent on a phone: a file read needs `expo-file-system` plus an
 * `expo-asset` handle, and a network fetch of the same bytes would defeat the
 * point of offline play. So the native app imports the JSON straight into the
 * JS bundle, which Metro resolves at build time and the OS then has inside the
 * APK. Same generator, same schema-parsed rows, one content source.
 *
 * Unlike `public/bank.json` this file is committed rather than regenerated on
 * every build, because a Metro bundle is not something a Next build hook can
 * refresh. `npm run validate` fails when it drifts from `content/questions`, so
 * a stale asset cannot ship quietly; `npm run bundle:bank` rewrites it.
 */
export function nativeBankBundlePath(projectRoot: string): string {
  return join(projectRoot, "apps", "mobile", "assets", "bank.json");
}

export function writeNativeBankBundle(projectRoot: string): { path: string; count: number } {
  const bundle = buildBankBundle(join(projectRoot, "content", "questions"));
  const outPath = nativeBankBundlePath(projectRoot);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(bundle));
  return { path: outPath, count: bundle.count };
}
