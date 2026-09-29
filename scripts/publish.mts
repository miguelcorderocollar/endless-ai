import { createHash } from "crypto";
import { execSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

import { ConvexHttpClient } from "convex/browser";

import { api } from "../convex/_generated/api";
import { loadBank, publishedOnly } from "../src/lib/questions/load";

/**
 * Publishes the validated bank snapshot to the selected Convex deployment.
 *
 * Usage: `npx tsx scripts/publish.mts [--url <convex-url>]`
 *
 * 1. Loads `content/questions/*.json`, fails on any file error.
 * 2. Compares the published set against the latest snapshot (fingerprint).
 *    Identical content is a no-op — no new version is minted.
 * 3. Otherwise mints version = latest + 1 and upserts the snapshot.
 *
 * Run `npm run validate` first. Publish only from a clean tree.
 * Target URL: `--url`, else `CONVEX_URL`, else `NEXT_PUBLIC_CONVEX_URL`
 * from `.env.local` (written by `npx convex dev`).
 */
function argValue(flag: string): string | null {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? (process.argv[i + 1] ?? null) : null;
}

function envFileValue(key: string): string | null {
  const path = join(process.cwd(), ".env.local");
  if (!existsSync(path)) return null;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(new RegExp(`^${key}=(.*)$`));
    if (m) return m[1]!.trim().replace(/^["']|["']$/g, "");
  }
  return null;
}

const url =
  argValue("--url") ??
  process.env.CONVEX_URL ??
  process.env.NEXT_PUBLIC_CONVEX_URL ??
  envFileValue("NEXT_PUBLIC_CONVEX_URL");

if (!url) {
  console.error(
    "No Convex URL. Run `npx convex dev` first, or pass `--url <convex-url>`.",
  );
  process.exit(1);
}

const { questions, fileErrors } = loadBank();
if (fileErrors.length > 0) {
  for (const e of fileErrors) console.error(`${e.file}: ${e.issues.join("; ")}`);
  console.error("publish aborted: bank has file errors, run `npm run validate`.");
  process.exit(1);
}
const published = publishedOnly(questions);
if (published.length === 0) {
  console.error("publish aborted: no published questions in the bank.");
  process.exit(1);
}

const fingerprint = (ids: string[]) =>
  createHash("sha1").update([...ids].sort().join("\n")).digest("hex");

const client = new ConvexHttpClient(url);
const latest = await client.query(api.snapshots.latest, {});
const nextFingerprint = fingerprint(published.map((q) => `${q.id}:${q.text}`));

if (latest) {
  const currentFingerprint = fingerprint(
    latest.questions.map((q) => `${q.questionId}:${q.text}`),
  );
  if (currentFingerprint === nextFingerprint) {
    console.log(`snapshot v${latest.version} already current (${latest.questionCount} questions), nothing to do.`);
    process.exit(0);
  }
}

let commit: string | undefined;
try {
  const status = execSync("git status --porcelain", { encoding: "utf8" }).trim();
  if (status) console.warn("warning: publishing from a dirty tree.");
  commit = execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
} catch {
  /* git metadata is a nicety, not a requirement */
}

const result = await client.mutation(api.snapshots.publishSnapshot, {
  version: (latest?.version ?? 0) + 1,
  commit,
  questions: published.map((q) => ({
    questionId: q.id,
    text: q.text,
    options: [...q.options],
    answer: q.answer,
    category: q.category,
    difficulty: q.difficulty,
    explanation: q.explanation,
    source: q.source,
    tags: [...q.tags],
    addedAt: q.addedAt,
  })),
});

console.log(
  result.deduped
    ? `snapshot v${result.version} already published, nothing written.`
    : `published snapshot v${result.version} (${result.count} questions)${commit ? ` at ${commit}` : ""}.`,
);
