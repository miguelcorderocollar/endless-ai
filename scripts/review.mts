/**
 * npm run review
 *
 * Builds a self-contained human-review page for draft questions:
 *   review/review.json  - machine-readable bundle (questions + validator flags)
 *   review/review.html  - open in a browser, search/filter, mark verdicts,
 *                         export feedback lines keyed by question ID.
 *
 * Flags: --status=draft,review (default) | --all | --no-validate
 */
import { execFileSync } from "child_process";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { createServer } from "http";
import { join } from "path";

import { loadBank } from "../src/lib/questions/load";
import type { Question } from "../src/lib/questions/schema";

const args = process.argv.slice(2);
const ALL = args.includes("--all");
const SKIP_VALIDATE = args.includes("--no-validate");
const SERVE = args.includes("--serve");
const portArg = args.find((a) => a.startsWith("--port="));
const PORT = portArg ? parseInt(portArg.slice("--port=".length), 10) : 8901;
const statusArg = args.find((a) => a.startsWith("--status="));
const STATUSES = statusArg ? statusArg.slice("--status=".length).split(",") : ["draft", "review"];

const OUT_DIR = join(process.cwd(), "review");

type Flag = { level: "error" | "warn" | "info"; rule: string; message: string };

function runValidator(): Map<string, Flag[]> {
  const flags = new Map<string, Flag[]>();
  if (SKIP_VALIDATE) return flags;
  let out = "";
  try {
    out = execFileSync("npx", ["tsx", "scripts/validate.mts"], {
      encoding: "utf8",
      timeout: 300_000,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (e) {
    out = ((e as { stdout?: unknown }).stdout as string) ?? "";
  }
  let section: "warn" | "error" | null = null;
  for (const line of out.split("\n")) {
    if (/^Warnings \(\d+\)/.test(line)) {
      section = "warn";
      continue;
    }
    if (/^Errors \(\d+\)/.test(line)) {
      section = "error";
      continue;
    }
    if (/^validate (passed|FAILED)/.test(line)) {
      section = null;
      continue;
    }
    if (section) {
      const m = /^ {2}(\S+)\s+(\S+)\s+(.*)$/.exec(line);
      if (m) {
        const [, id, rule, message] = m;
        const list = flags.get(id) ?? [];
        list.push({ level: section, rule, message });
        flags.set(id, list);
      }
    }
  }
  return flags;
}

function localFlags(q: Question): Flag[] {
  const flags: Flag[] = [];
  // Note: single-question length tells are noise (half of all questions); the
  // validator's corpus-level length-bias check covers the real problem.
  if (q.explanation.length < 80) {
    flags.push({ level: "info", rule: "short-explanation", message: "explanation under 80 chars" });
  }
  if (q.source.kind === "none") {
    flags.push({ level: "info", rule: "no-source", message: "Learn button hidden; explanation carries it" });
  }
  return flags;
}

function renderHtml(payload: unknown): string {
  const json = JSON.stringify(payload).replace(/<\//g, "<\\/");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Endless AI — question review</title>
<style>
body { font-family: system-ui, sans-serif; background: #0a0b0d; color: #f2efe9;
  margin: 0 auto; max-width: 42rem; width: 100%; padding: 0 20px 64px; box-sizing: border-box;
  -webkit-font-smoothing: antialiased; }
header.mast { display: flex; align-items: baseline; justify-content: space-between;
  border-bottom: 1px solid #23262b; padding: 20px 0; }
.brand { font-family: Georgia, serif; font-size: 24px; letter-spacing: -0.01em; }
.brand .sig { color: #d6ff3f; }
.label { font-family: ui-monospace, monospace; font-size: 11px; letter-spacing: .16em; text-transform: uppercase; }
.muted { color: #6f7580; }
h1 { font-family: Georgia, serif; font-weight: 400; font-size: 28px; line-height: 1.25; margin: 32px 0 4px; }
h1 #count { color: #6f7580; font-size: 18px; }
.controls { position: sticky; top: 0; padding: 12px 0; background: rgba(10,11,13,.97);
  border-bottom: 1px solid #23262b; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; z-index: 5; }
.controls input[type=search] { flex: 1 1 200px; }
input[type=search], input[type=text], select { background: #0a0b0d; color: #f2efe9;
  border: 1px solid #23262b; padding: 8px 10px; font-size: 14px; border-radius: 0; }
input::placeholder { color: #6f7580; }
button { font-family: ui-monospace, monospace; font-size: 11px; letter-spacing: .16em; text-transform: uppercase;
  background: #d6ff3f; color: #0a0b0d; border: 1px solid #d6ff3f;
  padding: 10px 20px; cursor: pointer; border-radius: 0; }
button:hover { background: #f2efe9; border-color: #f2efe9; }
button.ghost { background: transparent; color: #f2efe9; border-color: #23262b; }
button.ghost:hover { border-color: rgba(242,239,233,.5); background: rgba(242,239,233,.04); }
button.mini { padding: 6px 10px; }
.toolbar { display: flex; gap: 16px; align-items: center; margin: 16px 0 8px; flex-wrap: wrap; }
section.q { border-top: 1px solid #23262b; padding: 20px 0 28px; }
.idrow { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
.id { font-family: ui-monospace, monospace; font-size: 11px; letter-spacing: .16em; text-transform: uppercase; color: #6f7580; }
.chip { font-family: ui-monospace, monospace; font-size: 11px; letter-spacing: .16em; text-transform: uppercase; color: #6f7580; }
.flag { font-family: ui-monospace, monospace; font-size: 11px; letter-spacing: .1em; text-transform: uppercase;
  padding: 2px 8px; font-weight: 700; }
.flag.error { background: #ff5a36; color: #0a0b0d; }
.flag.warn { background: #fa0; color: #0a0b0d; }
.flag.info { background: #48c; color: #fff; }
.qtext { font-family: Georgia, serif; font-weight: 400; font-size: 28px; line-height: 1.25; margin: 12px 0 0; }
ul.opts { margin: 28px 0 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 8px; }
ul.opts li { display: flex; align-items: flex-start; gap: 16px; border: 1px solid #23262b;
  padding: 14px 16px; font-size: 15px; line-height: 1.4; }
ul.opts li .letter { font-family: ui-monospace, monospace; font-size: 11px; letter-spacing: .16em;
  margin-top: 2px; width: 16px; flex-shrink: 0; opacity: .6; }
ul.opts li.answer { border-color: #d6ff3f; background: #d6ff3f; color: #0a0b0d; font-weight: 600; }
ul.opts li.answer .letter { opacity: 1; }
.expl { font-size: 15px; line-height: 1.65; color: rgba(242,239,233,.85); margin: 24px 0 0; }
.meta { font-size: 13px; color: #6f7580; margin-top: 16px; line-height: 1.7; }
a.learn { font-family: ui-monospace, monospace; font-size: 11px; letter-spacing: .16em; text-transform: uppercase;
  color: #6f7580; text-decoration: none; }
a.learn:hover { color: #d6ff3f; }
.verdict { margin-top: 20px; padding-top: 16px; border-top: 1px solid #23262b;
  display: flex; gap: 16px; flex-wrap: wrap; align-items: center; }
.verdict input[type=radio] { accent-color: #d6ff3f; }
.verdict input[type=text] { flex: 1 1 200px; }
pre#export { white-space: pre-wrap; border: 1px dashed #6f7580; padding: 10px 12px; font-size: 13px; }
.hidden { display: none !important; }
</style>
</head>
<body>
<header class="mast">
<span class="brand">Endless <span class="sig">AI</span></span>
<span class="label muted">review queue</span>
</header>
<h1>Drafts <span id="count"></span></h1>
<div class="controls">
<input type="search" id="q" placeholder="Search id, text, options, explanation, tags…">
<select id="cat"><option value="">all categories</option></select>
<select id="dif"><option value="">all difficulties</option><option>1</option><option>2</option><option>3</option><option>4</option><option>5</option></select>
<select id="src"><option value="">any source</option><option value="wikipedia">wikipedia</option><option value="url">url</option><option value="none">none</option></select>
<label><input type="checkbox" id="flagged"> only flagged</label>
</div>
<div class="toolbar">
<span id="summary" class="label muted"></span>
<button id="exportBtn">Copy feedback</button>
<button id="clearBtn" class="ghost">Clear verdicts</button>
</div>
<pre id="export" class="hidden"></pre>
<div id="unmatched"></div>
<div id="list"></div>
<script type="application/json" id="data">${json}</script>
<script>
const payload = JSON.parse(document.getElementById('data').textContent);
const items = payload.items;
const store = JSON.parse(localStorage.getItem('eq-review-verdicts') || '{}');
function saveStore() { localStorage.setItem('eq-review-verdicts', JSON.stringify(store)); }
const cats = [...new Set(items.map(i => i.category))].sort();
const catSel = document.getElementById('cat');
cats.forEach(c => { const o = document.createElement('option'); o.value = c; o.textContent = c; catSel.appendChild(o); });
const list = document.getElementById('list');
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function cardHTML(it) {
  var LETTERS = ['A', 'B', 'C', 'D'];
  const opts = it.options.map((o, i) =>
    '<li class="' + (i === it.answerIndex ? 'answer' : '') + '">' +
    '<span class="letter">' + LETTERS[i] + '</span>' +
    '<span>' + esc(o) + '</span></li>').join('');
  const flags = it.flags.map(f =>
    '<span class="flag ' + f.level + '" title="' + esc(f.message) + '">' + esc(f.rule) + '</span>').join(' ');
  const src = it.source.kind === 'wikipedia'
    ? '<a class="learn" href="https://en.wikipedia.org/wiki/' + encodeURIComponent(it.source.title.replace(/ /g, '_')) + '" target="_blank" rel="noreferrer">' + esc(it.source.label) + ' <span>→</span></a>'
    : it.source.kind === 'url'
    ? '<a class="learn" href="' + esc(it.source.url) + '" target="_blank" rel="noreferrer">' + esc(it.source.label) + ' <span>→</span></a>'
    : '<span class="label muted">no source</span>';
  const v = store[it.id] || { verdict: 'pending', note: '' };
  return '<section class="q" data-id="' + it.id + '">' +
    '<div class="idrow"><span class="id">' + it.id + '</span>' +
    '<button class="ghost mini" data-copy="' + it.id + '">copy id</button>' +
    '<span class="chip">' + it.category + '</span>' +
    '<span class="chip">d' + it.difficulty + '</span>' +
    '<span class="chip">' + it.source.kind + '</span>' + flags + '</div>' +
    '<h2 class="qtext">' + esc(it.text) + '</h2>' +
    '<ul class="opts">' + opts + '</ul>' +
    '<p class="expl">' + esc(it.explanation) + '</p>' +
    '<div class="meta"><span class="label muted">source</span> ' + src +
    '<br><span class="label muted">tags</span> ' + esc((it.tags || []).join(', ')) +
    (it.answerAliases && it.answerAliases.length ? '<br><span class="label muted">aliases</span> ' + esc(it.answerAliases.join(', ')) : '') + '</div>' +
    '<div class="verdict">' +
    ['pending', 'approve', 'reject', 'edit'].map(x =>
      '<label class="label"><input type="radio" name="v-' + it.id + '" value="' + x + '"' + (v.verdict === x ? ' checked' : '') + '> ' + x + '</label>').join('') +
    '<input type="text" placeholder="note (reason for reject, fix for edit)" data-note="' + it.id + '" value="' + esc(v.note || '') + '">' +
    '</div></section>';
}
function haystack(it) {
  return (it.id + ' ' + it.text + ' ' + it.options.join(' ') + ' ' + it.explanation + ' ' + (it.tags || []).join(' ')).toLowerCase();
}
function applyFilter() {
  const q = document.getElementById('q').value.toLowerCase();
  const c = catSel.value, d = document.getElementById('dif').value, s = document.getElementById('src').value;
  const fl = document.getElementById('flagged').checked;
  let n = 0;
  for (const el of list.children) {
    const it = items.find(i => i.id === el.dataset.id);
    const ok = (!q || haystack(it).includes(q)) && (!c || it.category === c) &&
      (!d || String(it.difficulty) === d) && (!s || it.source.kind === s) &&
      (!fl || it.flags.length > 0);
    el.classList.toggle('hidden', !ok);
    if (ok) n++;
  }
  document.getElementById('count').textContent = '(' + n + ' shown / ' + items.length + ' total)';
  const appr = Object.values(store).filter(v => v.verdict === 'approve').length;
  const rej = Object.values(store).filter(v => v.verdict === 'reject').length;
  const ed = Object.values(store).filter(v => v.verdict === 'edit').length;
  document.getElementById('summary').textContent = 'verdicts: ' + appr + ' approve, ' + rej + ' reject, ' + ed + ' edit';
}
list.innerHTML = items.map(cardHTML).join('');
document.getElementById('unmatched').innerHTML = (payload.unmatched && payload.unmatched.length)
  ? '<section class="q"><p class="label muted">unmatched validator issues</p><p class="expl">' + payload.unmatched.map(u => esc(u.id + ' [' + u.rule + '] ' + u.message)).join('<br>') + '</p></section>' : '';
list.addEventListener('change', e => {
  const r = e.target;
  if (r.name && r.name.startsWith('v-')) {
    const id = r.name.slice(2);
    store[id] = store[id] || { verdict: 'pending', note: '' };
    store[id].verdict = r.value; saveStore(); applyFilter();
  }
});
list.addEventListener('input', e => {
  if (e.target.dataset.note) {
    const id = e.target.dataset.note;
    store[id] = store[id] || { verdict: 'pending', note: '' };
    store[id].note = e.target.value; saveStore(); applyFilter();
  }
});
list.addEventListener('click', e => {
  const b = e.target.closest('[data-copy]');
  if (b) navigator.clipboard.writeText(b.dataset.copy);
});
['q', 'cat', 'dif', 'src', 'flagged'].forEach(id => {
  document.getElementById(id).addEventListener(id === 'q' ? 'input' : 'change', applyFilter);
});
document.getElementById('exportBtn').addEventListener('click', () => {
  const appr = [], rest = [];
  for (const [id, v] of Object.entries(store)) {
    if (v.verdict === 'approve') appr.push(id);
    else if (v.verdict === 'reject') rest.push('reject ' + id + ': ' + (v.note || 'no reason given'));
    else if (v.verdict === 'edit') rest.push('edit ' + id + ': ' + (v.note || '(describe fix)'));
  }
  const lines = [];
  if (appr.length) lines.push('approve: ' + appr.sort().join(', '));
  lines.push(...rest.sort());
  const pre = document.getElementById('export');
  pre.textContent = lines.join('\\n') || '(no verdicts yet)';
  pre.classList.remove('hidden');
  if (lines.length) navigator.clipboard.writeText(lines.join('\\n'));
});
document.getElementById('clearBtn').addEventListener('click', () => {
  Object.keys(store).forEach(k => delete store[k]);
  saveStore();
  list.innerHTML = items.map(cardHTML).join('');
  applyFilter();
});
applyFilter();
</script>
</body>
</html>`;
}

async function main() {
  const { questions } = loadBank();
  const queue = ALL ? questions : questions.filter((q) => STATUSES.includes(q.status));
  console.log(`review: ${queue.length} questions (status: ${ALL ? "all" : STATUSES.join(",")})`);

  const flagMap = runValidator();

  const items = queue.map((q) => {
    const answerIndex = q.options.indexOf(q.answer);
    const flags: Flag[] = [...(flagMap.get(q.id) ?? []), ...localFlags(q)];
    flagMap.delete(q.id);
    return { ...q, answerIndex, flags };
  });
  // Unmatched validator issues (warnings on published questions, file errors)
  // are only relevant when reviewing the whole bank, not the draft queue.
  const leftover = ALL
    ? [...flagMap.entries()].map(([id, flags]) => ({ id, flags }))
    : [];

  const payload = {
    generatedAt: new Date().toISOString(),
    bankTotal: questions.length,
    queueStatuses: ALL ? ["all"] : STATUSES,
    items,
    unmatched: leftover.flatMap(({ id, flags }) => flags.map((f) => ({ id, ...f }))),
  };

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, "review.json"), JSON.stringify(payload, null, 2) + "\n");
  writeFileSync(join(OUT_DIR, "review.html"), renderHtml(payload));
  const flagged = items.filter((i) => i.flags.length > 0).length;
  console.log(`review: wrote review/review.json + review/review.html (${flagged}/${items.length} flagged)`);

  if (SERVE) {
    const server = createServer((req, res) => {
      const name = (req.url ?? "/").split("?")[0] === "/" ? "review.html" : (req.url ?? "/").split("?")[0].slice(1);
      if (name !== "review.html" && name !== "review.json") {
        res.statusCode = 404;
        res.end("not found");
        return;
      }
      try {
        const data = readFileSync(join(OUT_DIR, name));
        res.setHeader("Content-Type", name.endsWith(".json") ? "application/json" : "text/html; charset=utf-8");
        res.end(data);
      } catch {
        res.statusCode = 404;
        res.end("not found");
      }
    });
    server.listen(PORT, () => {
      console.log(`\nReview: http://localhost:${PORT}/review.html\n`);
    });
  }
}

main();
