/**
 * Duplicate detection: embeddings shortlist, Jev adjudicates (issue #38).
 *
 *   npm run dupe           # cached: adjudicates only new or edited pairs
 *   npm run dupe:refresh   # ignore the verdict cache, re-adjudicate everything
 *   npm run dupe -- --offline   # stage 1 only, no network
 *
 * Why two stages: jev-1.13 has a 64k token/request budget covering state *plus
 * all questions*, and its docs list "large state full of irrelevant detail" as a
 * failure mode ("Jev suffers from context rot"). So the whole bank is never sent.
 * Embeddings reduce 10,000 questions to the few hundred pairs that matter, which
 * is both cheaper and more accurate.
 *
 * Why a verdict cache: candidate pairs grow linearly at fixed k, so a normal batch
 * of 40 questions creates ~70-100 new pairs (~$0.0008). Without the cache every
 * run re-pays for pairs already judged.
 *
 * Keys are content hashes, not ids. Editing a question's wording changes the hash
 * and forces re-adjudication; an id-keyed cache would keep serving verdicts about
 * text that no longer exists.
 */

import { createHash } from "crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync, appendFileSync } from "fs";
import { join } from "path";

import { loadBank } from "../src/lib/questions/load";

/**
 * tsx does not load .env the way Next does, and the repo has no dotenv
 * dependency. Without this, stage 1 silently runs on cached vectors only and
 * stage 2 401s, which is exactly the failure that is easy to misread as "the
 * bank has no duplicates".
 */
loadEnvFile();

function loadEnvFile(): void {
  for (const file of [".env.local", ".env"]) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
      if (!m) continue;
      const key = m[1]!;
      if (process.env[key] !== undefined) continue; // real env wins
      process.env[key] = m[2]!.replace(/^["']|["']$/g, "");
    }
  }
}

const OFFLINE = process.argv.includes("--offline");
const REFRESH = process.argv.includes("--refresh");

/** Noul probability at or above which a pair is reported. */
const REPORT_AT = 0.7;
/** Nearest neighbours per question. 6 -> 1297 pairs, 2 -> 348, both 18/18 on the
 *  labelled set. Above 2 starts losing cross-category duplicates. */
const TOP_K = 2;
/** Cosine floor. Raising it does not cleanly separate: the 18 true pairs span
 * 0.654-0.931, overlapping ordinary related pairs. 0.65 is the lowest value that
 * still keeps all 18. */
const FLOOR = 0.65;
/** 4096 dims truncated. Every true pair survives truncation down to 256, so this
 * only drops incidental similar pairs, which is noise reduction. */
const DIMS = 1024;
const EMB_MODEL = "qwen/qwen3-embedding-8b";
/**
 * Pinned, not `jev-latest`: the alias moves on release, which would silently
 * invalidate a threshold tuned against it. OpenRouter accepts `jev-latest`,
 * `jev-1.13` and `typesafe/jev-1.13` (all resolve to the same build) but NOT
 * the `jev-1.13.0` form from the TypeSafe docs. The response reports the exact
 * build as `typesafe/jev-1.13-20260917`, which is recorded per verdict so a
 * future model bump is visible in the diff.
 */
const JEV_MODEL = "jev-1.13";
/** Runs averaged per pair. Single runs drift up to ~0.22 on some pairs. */
const RUNS = 2;

/**
 * The definition is part of every verdict. Keep it a versioned constant: the hash
 * goes into the verdict key, so rewording it correctly invalidates the whole cache
 * rather than silently mixing verdicts from two different rubrics.
 */
const DEFINITION = [
  "Two questions ask the same fact when a player would answer both the same way",
  "for the same reason, even if worded differently or filed under different",
  "categories. They do NOT ask the same fact when they merely share a topic, when",
  "they happen to have the same correct answer, or when one asks who or when and",
  "the other asks what.",
].join(" ");

const CRITERIA = {
  true: "The two questions test the same underlying fact",
  false: "The two questions test different facts",
};

const DATA_DIR = join(process.cwd(), "data", "dupe");
const VERDICTS = join(DATA_DIR, "verdicts.json");
const LABELLED = join(DATA_DIR, "labelled.json");
const EMBEDDINGS = join(DATA_DIR, "embeddings.jsonl");
const REPORT = join(DATA_DIR, "report.md");

const OR = (process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1").replace(/\/$/, "");
/** Not under /v1. The v1-prefixed decisions path 404s. */
const DECISIONS = "https://openrouter.ai/api/alpha/decisions";

const key = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 16);
const DEFINITION_HASH = key(DEFINITION);

/* ------------------------------------------------------------------ *
 * api
 * ------------------------------------------------------------------ */

type Noul = { type: "noul"; noul: number };
type EmbedResponse = { data: { embedding: number[] }[] };
type DecisionsResponse = {
  model?: string;
  answers: Record<string, Noul>;
  usage?: { input_tokens?: number; cost?: number };
};

async function post<T>(url: string, payload: unknown, timeoutMs = 600_000): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}: ${(await res.text()).slice(0, 300)}`);
  return (await res.json()) as T;
}

/* ------------------------------------------------------------------ *
 * stage 1: embeddings
 * ------------------------------------------------------------------ */

type Vec = { id: string; v: number[] };

function loadEmbeddings(): Map<string, number[]> {
  const out = new Map<string, number[]>();
  if (!existsSync(EMBEDDINGS)) return out;
  for (const line of readFileSync(EMBEDDINGS, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      const row = JSON.parse(line) as Vec;
      if (Array.isArray(row.v) && row.v.length >= DIMS) out.set(row.id, row.v.slice(0, DIMS));
    } catch {
      /* skip a corrupt line rather than losing the cache */
    }
  }
  return out;
}

async function embedMissing(ids: string[], texts: Map<string, string>): Promise<Map<string, number[]>> {
  const have = loadEmbeddings();
  const missing = ids.filter((id) => !have.has(id));
  if (missing.length === 0) return have;

  if (OFFLINE) {
    console.log(`offline: ${missing.length} question(s) have no cached vector, skipping them`);
    return have;
  }
  if (!process.env.OPENROUTER_API_KEY) {
    console.log("no OPENROUTER_API_KEY; stage 1 limited to cached vectors");
    return have;
  }

  // Append-only: a vector is computed once and reused forever. The embedding API
  // is not deterministic (measured max drift 1.95e-3, ~3.8% candidate churn), so
  // recomputing would destabilise the candidate set for no reason.
  const BATCH = 64;
  for (let i = 0; i < missing.length; i += BATCH) {
    const chunk = missing.slice(i, i + BATCH);
    const r = await post<EmbedResponse>(`${OR}/embeddings`, {
      model: EMB_MODEL,
      input: chunk.map((id) => `${id} | ${texts.get(id)}`),
    });
    r.data.forEach((row, k) => {
      const id = chunk[k];
      if (!id) return;
      const v = row.embedding.slice(0, DIMS);
      have.set(id, v);
      appendFileSync(EMBEDDINGS, `${JSON.stringify({ id, v })}\n`);
    });
    process.stdout.write(`\r  embedded ${Math.min(i + BATCH, missing.length)}/${missing.length}`);
  }
  process.stdout.write("\n");
  return have;
}

function cos(a: number[], b: number[]): number {
  let d = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    d += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  return d / (Math.sqrt(na) * Math.sqrt(nb));
}

type Pair = { a: string; b: string };

/** Symmetric candidate pairs, de-duplicated. */
function shortlist(ids: string[], vecs: Map<string, number[]>): Pair[] {
  const pairs = new Set<string>();
  for (const i of ids) {
    const ranked = ids
      .filter((j) => j !== i)
      .map((j) => ({ j, s: cos(vecs.get(i)!, vecs.get(j)!) }))
      .sort((x, y) => y.s - x.s)
      .slice(0, TOP_K);
    for (const { j, s } of ranked) {
      if (s < FLOOR) continue;
      pairs.add([i, j].sort().join("\u0000"));
    }
  }
  return [...pairs].map((p) => {
    const [a, b] = p.split("\u0000");
    return { a: a!, b: b! };
  });
}

/* ------------------------------------------------------------------ *
 * stage 2: Jev
 * ------------------------------------------------------------------ */

type Verdict = { noul: number; model: string; definitionHash: string; runs: number };

function loadVerdicts(): Map<string, Verdict> {
  if (!existsSync(VERDICTS)) return new Map();
  try {
    const raw = JSON.parse(readFileSync(VERDICTS, "utf8")) as Record<string, Verdict>;
    return new Map(Object.entries(raw));
  } catch {
    return new Map();
  }
}

function pairKey(p: Pair, byId: Map<string, { text: string; answer: string }>): string {
  const side = (id: string) => {
    const q = byId.get(id)!;
    return `${id}\u0001${q.text}\u0001${q.answer}`;
  };
  // sorted so pair order never changes the key
  const body = [side(p.a), side(p.b)].sort().join("\u0002");
  return key(`${body}\u0003${JEV_MODEL}\u0003${DEFINITION_HASH}`);
}

async function adjudicate(pairs: Pair[], byId: Map<string, { text: string; answer: string }>) {
  const scores = new Map<string, number[]>();
  const CHUNK = 400;
  for (let start = 0; start < pairs.length; start += CHUNK) {
    const part = pairs.slice(start, start + CHUNK);
    // All pairs in a chunk share one state; each question names its own pair.
    // Keeping per-question instructions tiny is what makes this fit the budget.
    const lines = [`definition: ${DEFINITION}`, ""];
    const questions: Record<string, unknown> = {};
    part.forEach((p, n) => {
      lines.push(`pair ${n}:`);
      lines.push(`  a: ${p.a} | ${byId.get(p.a)!.text}`);
      lines.push(`  b: ${p.b} | ${byId.get(p.b)!.text}`);
      questions[`pair_${n}`] = {
        type: "noul",
        instructions: `Do the two questions in \`pair ${n}\` ask the same fact?`,
        criteria: CRITERIA,
      };
    });
    const r = await post<DecisionsResponse>(DECISIONS, {
      state: lines.join("\n"),
      model: JEV_MODEL,
      questions,
    });
    for (let n = 0; n < part.length; n++) {
      const k = keyPart(part[n]!);
      const v = r.answers[`pair_${n}`]?.noul;
      if (v === undefined) continue;
      if (!scores.has(k)) scores.set(k, []);
      scores.get(k)!.push(v);
    }
    process.stdout.write(`\r  pairs ${start + part.length}/${pairs.length}`);
  }
  process.stdout.write("\n");
  return scores;

  function keyPart(p: Pair) {
    return [p.a, p.b].sort().join("\u0000");
  }
}

/* ------------------------------------------------------------------ *
 * main
 * ------------------------------------------------------------------ */

async function main() {
  const { questions, fileErrors } = loadBank();
  if (fileErrors.length) {
    for (const f of fileErrors) console.error(`${f.file}: ${f.issues.join("; ")}`);
    process.exit(1);
  }
  const byId = new Map(questions.map((q) => [q.id, { text: q.text, answer: q.answer, category: q.category }]));
  const ids = questions.map((q) => q.id);
  const texts = new Map(questions.map((q) => [q.id, q.text]));
  mkdirSync(DATA_DIR, { recursive: true });

  console.log(`bank: ${questions.length} questions`);
  console.log(`config: k=${TOP_K} floor=${FLOOR} dims=${DIMS} model=${JEV_MODEL} report>=${REPORT_AT}`);

  const vecs = await embedMissing(ids, texts);
  const usable = ids.filter((id) => vecs.has(id));
  if (usable.length < 2) {
    console.log("not enough vectors to compare");
    return;
  }
  if (usable.length < ids.length) {
    console.log(`comparing ${usable.length}/${ids.length} (rest have no vector)`);
  }

  const pairs = shortlist(usable, vecs);
  console.log(`stage 1: ${pairs.length} candidate pairs`);

  if (OFFLINE) {
    console.log("offline: stage 1 only");
    return;
  }

  const cache = REFRESH ? new Map<string, Verdict>() : loadVerdicts();
  const fresh: Pair[] = [];
  for (const p of pairs) {
    if (!cache.has(pairKey(p, byId))) fresh.push(p);
  }
  console.log(
    `stage 2: ${fresh.length} new pair(s) to adjudicate, ${pairs.length - fresh.length} cached`,
  );

  if (fresh.length) {
    const runs: Verdict[][] = [];
    for (let r = 0; r < RUNS; r++) {
      const got = await adjudicate(fresh, byId);
      runs.push([...got.entries()].map(([k, v]) => ({ k, noul: v })));
    }
    fresh.forEach((p, i) => {
      const k = pairKey(p, byId);
      const partKey = [p.a, p.b].sort().join("\u0000");
      const vals = runs.map((run) => run.find((x) => x.k === partKey)?.noul ?? []).flat();
      const mean = vals.reduce((s, v) => s + v, 0) / (vals.length || 1);
      cache.set(k, { noul: Number(mean.toFixed(4)), model: JEV_MODEL, definitionHash: DEFINITION_HASH, runs: RUNS });
    });
    writeFileSync(VERDICTS, `${JSON.stringify(Object.fromEntries([...cache].sort()), null, 2)}\n`);
    console.log(`cached ${fresh.length} verdict(s) -> data/dupe/verdicts.json`);
  }

  /* ---- report ---- */
  const flagged = pairs
    .map((p) => ({ ...p, v: cache.get(pairKey(p, byId)) }))
    .filter((x): x is Pair & { v: Verdict } => !!x.v && x.v.noul >= REPORT_AT)
    .sort((a, b) => b.v.noul - a.v.noul);

  const lines: string[] = [
    `# Duplicate candidates`,
    ``,
    `${questions.length} questions, ${pairs.length} candidate pairs, ${flagged.length} at or above ${REPORT_AT}.`,
    `Generated by \`npm run dupe\`. Pairs are suggestions, not verdicts: Jev is calibrated,`,
    `not infallible. Confirm each pair by hand, then reword or delete one side.`,
    ``,
  ];
  for (const f of flagged) {
    const a = byId.get(f.a)!;
    const b = byId.get(f.b)!;
    lines.push(`## ${f.v.noul.toFixed(2)}  \`${f.a}\` / \`${f.b}\``);
    lines.push(``);
    lines.push(`- **${f.a}** (${a.category}) ${a.text} -> ${a.answer}`);
    lines.push(`- **${f.b}** (${b.category}) ${b.text} -> ${b.answer}`);
    lines.push(``);
  }
  writeFileSync(REPORT, `${lines.join("\n")}\n`);
  console.log(`\n${flagged.length} pair(s) at or above ${REPORT_AT} -> data/dupe/report.md`);
  for (const f of flagged) {
    console.log(`  ${f.v.noul.toFixed(2)}  ${f.a} / ${f.b}`);
  }
  if (existsSync(LABELLED)) {
    console.log(`\nlabelled pairs in data/dupe/labelled.json were not used to score this run`);
  }
}

await main();
