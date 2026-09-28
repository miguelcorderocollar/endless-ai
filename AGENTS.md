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
