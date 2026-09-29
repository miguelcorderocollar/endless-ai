# Endless AI

Prototype of an endless AI quiz. Start here before changing code or questions.

## Commands

- `npm run dev` starts the app.
- `npm run validate` checks every question for schema, answer integrity, distractor shape, balance, and source grounding.
- `npm run validate:offline` skips live Wikipedia and URL checks.
- `npm run typecheck` runs TypeScript.
- `npm run lint` runs ESLint.
- `npm run build` builds the Next.js production app.
- `npm run verify` runs validate, typecheck, lint, and build.
- `npm run rebalance` reports answer-slot balance; add `--write` only after reviewing the diff.
- `npm run probe -- "Title" ...` inspects Wikipedia lead sections before authoring.
- `npm run review` builds `review/review.html`, a self-contained page for human review of draft questions (search, filter, per-ID verdicts).
- `npm run review:serve` builds it and serves it at `http://localhost:8901/review.html`.
- `npx convex dev` syncs the backend to your dev deployment (watch mode); `npm run dev` is the frontend.
- `npx tsx scripts/publish.mts` syncs the validated bank to dev (`--prod` for prod).

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

## Code rules

- Keep the quiz loop simple: no timer, immediate feedback, Learn when a source exists.
- Elo updates belong in shared quiz code so the UI and backend can reuse them.
- Prototype progress is local only. Do not present it as an account, leaderboard, or shared result.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
