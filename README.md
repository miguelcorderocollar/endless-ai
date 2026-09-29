# Endless AI

An endless quiz about AI. Four options, no timer, play until you quit. A homage to [Endless Quiz](https://apps.apple.com/us/app/endless-quiz/id1251898178) by Christopher Masser, with harder questions and a source behind every Learn button.

Stack: Next.js (App Router) + TypeScript + Tailwind + Convex. Live at `https://endless-ai-quiz.vercel.app`.

## Quickstart

```bash
npm install
npx convex dev        # backend (watch mode) — needs `npx convex login` once
npm run dev           # frontend, in another terminal
```

`npx convex dev` writes `.env.local` for you. Never commit it.

## Content

Curated questions live in `content/questions/*.json` — that is the source of truth. Convex holds the published set (one doc per question id); the app plays from Convex.

```bash
npm run validate           # schema, answers, sources (full, incl. live checks)
npm run validate:offline   # skip live Wikipedia/URL checks
npx tsx scripts/publish.mts          # sync validated bank to dev
npx tsx scripts/publish.mts --prod   # sync validated bank to prod
```

Deleting a question from git does not remove it from play — it stays `published` until you publish, which archives it. See `docs/deployment.md`.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the app |
| `npm run validate` | Validate the question bank |
| `npm run typecheck` / `npm run lint` | TS + ESLint |
| `npm run test` / `npm run test:e2e` | Unit (vitest) / browser (Playwright, builds its own prod app on :3210) |
| `npm run build` | Production build |
| `npm run verify` | The gate before commit: validate + typecheck + lint + tests + build + e2e |
| `npm run dupe -- --offline` | Near-duplicate shortlist (needs `OPENROUTER_API_KEY` for full run) |
| `npm run review` | Build `review/review.html` for human question review |

## Deploy

Push to `main` ships to production (Vercel builds `main` and runs `convex deploy` first). Details in `docs/deployment.md`.

- Convex dev: `careful-salmon-552` · prod: `moonlit-blackbird-812`
- `npm run verify` before every push to `main`.

More context: `PLAN.md` (game design + roadmap), `docs/dataset.md` (question rules), `AGENTS.md` (workflow).
