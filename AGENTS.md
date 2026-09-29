# Endless AI

Prototype of an endless AI quiz. Start here before changing code or questions.

## Commands

- `npm run dev` starts the app.
- `npm run validate` checks every question for schema, answer integrity, distractor shape, balance, and source grounding.
- `npm run validate:offline` skips live Wikipedia and URL checks.
- `npm run typecheck` runs TypeScript.
- `npm run lint` runs ESLint.
- `npm run test` runs the unit tests (vitest).
- `npm run test:e2e` runs the browser tests (Playwright). It builds the app and starts it on port 3210, so it needs no dev server running.
- `npm run test:all` runs both suites.
- `npm run build` builds the Next.js production app.
- `npm run verify` runs validate, typecheck, lint, unit tests, build, and the browser suite.
- `npm run rebalance` reports answer-slot balance; add `--write` only after reviewing the diff.
- `npm run dupe` finds near-duplicate questions (embeddings + Jev, issue #38). Needs `OPENROUTER_API_KEY` in `.env`. Costs ~$0.005 for the current bank and re-runs are free from the verdict cache. Writes `data/dupe/report.md`. Local only, never in CI.
- `npm run dupe:refresh` re-adjudicates every pair, ignoring the cache. Use after changing the definition or the pinned model.
- `npm run dupe:score` scores the reporting threshold against the hand-labelled pairs in `data/dupe/labelled.json`.
- `npm run dupe -- --offline` runs the embedding shortlist only, no network.
- `npm run probe -- "Title" ...` inspects Wikipedia lead sections before authoring.
- `npm run review` builds `review/review.html`, a self-contained page for human review of draft questions (search, filter, per-ID verdicts).
- `npm run review:serve` builds it and serves it at `http://localhost:8901/review.html`.
- `npx convex dev` syncs the backend to your dev deployment (watch mode); `npm run dev` is the frontend.
- `npx tsx scripts/publish.mts` syncs the validated bank to dev (`--prod` for prod).

## Before you commit

`npm run verify` is the gate: validate, typecheck, lint, unit tests, build, then
the browser suite. Run it whole rather than the parts you remember, so nothing
lands on `main` untested. A push to `main` deploys to production, so this is the
only check between the two.

First time on a machine, and after Playwright upgrades:

```bash
npx playwright install chromium   # browsers are not in the repo
```

Keep the browser suite worth running:

- Specs assert the shipped UI, so a change to markup is a change to the spec.
  The suite builds a production app itself and needs no dev server.
- Specs must never depend on dev or prod Convex, or on `content/questions`.
  They seed a local draw cache and cut the network on purpose, so the degraded
  path is what runs on every pass. If a spec starts passing for the wrong
  reason — for instance the real deployment answers a query — fix the fixture,
  not the assertion.
- `manifest.shortcuts` and the worker's `ROUTES` must agree; the PWA spec fails
  if they drift, because a shortcut to an un-cached route 404s offline.
- Bump `VERSION` in `public/sw.js` when the shell changes shape.

## Deployment

- Read `docs/deployment.md` before touching Convex, Vercel env vars, or the build command.
- `content/questions/*.json` is the source of truth; Convex holds the published questions (one doc per questionId).
- Never commit `.env.local` (`CONVEX_DEPLOYMENT`, `NEXT_PUBLIC_CONVEX_URL`) or any deploy key.

## Content rules

- Curated questions live in `content/questions/*.json`.
- IDs are stable and use three-letter prefixes, for example `hst-0042`.
- `category` must use the exact schema key, for example `technology`, not `tech`.
- `answer` must match exactly one option.
- Every question needs an explanation.
- Prefer Wikipedia or primary sources. Use `"kind": "none"` only when no source exists, and make the explanation carry the teaching.
- Do not ship generated questions without `npm run validate` and a human read.
- `npm run validate` cannot see a reworded or cross-category repeat. Run
  `npm run dupe` before shipping a batch, and adjudicate every pair by hand: Jev is
  calibrated, not correct. A shared answer is not a shared fact, which is the most
  common false positive. Record the outcome in `data/dupe/labelled.json` so the
  threshold stays honest.

## Removing a duplicate

No Convex change is needed. Delete the question from
`content/questions/*.json` and run `npx tsx scripts/publish.mts`: `questions:prune`
archives any published row whose id is no longer in the bank, and every read path
filters on `status === "published"`, so it leaves the playable set immediately.
IDs are never reused, so the pruned id stays retired.

Prefer rewording over deleting when one side carries more value (a better hook, a
harder difficulty, a category that needs the coverage). Delete when the two are
genuinely interchangeable.

## Code rules

- Keep the quiz loop simple: no timer, immediate feedback, Learn when a source exists.
- Elo updates belong in shared quiz code so the UI and backend can reuse them.
- Prototype progress is local only. Do not present it as an account, leaderboard, or shared result.

## The installed app (PWA)

The app installs to the home screen from the browser and works offline. There is
no native wrapper and no app-store build. Two rules keep it honest:

- **`public/sw.js` caches the shell and nothing else.** Documents are
  network-first, `/_next/static` is cache-first, and Convex, auth and RSC
  payloads are never touched. A cached question set is a bug, not a feature.
- **Bump `VERSION` in `public/sw.js` when the shell changes shape.** It is
  served from `public/`, so Next never fingerprints it and a deploy will not
  retire the old caches on its own. Anything added to `ROUTES` (which the
  manifest shortcuts point at) has to be reachable offline.

The install banner waits for ten answered questions and remembers a refusal.
The profile always keeps a way in. `src/lib/pwa/install.ts` holds the platform
branches and is unit-tested; `e2e/pwa.spec.ts` covers the wiring. Both e2e and
the offline quiz run against a seeded local draw cache with Convex cut off, so
they exercise the degraded path on every run instead of only when the network
happens to be gone.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
