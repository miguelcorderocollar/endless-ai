# Deployment: Convex + Vercel

Source: [Convex Vercel hosting](https://docs.convex.dev/production/hosting/vercel.md),
[Multiple deployments](https://docs.convex.dev/production/multiple-deployments.md).
Convex CLI `1.46.0`, Vercel project `endless-ai` (`https://endless-ai-quiz.vercel.app`).

## Mental model

| Piece | What it is | Command |
| --- | --- | --- |
| Convex **dev** deployment | Personal cloud backend per developer. `npx convex dev` pushes `convex/` code there and watches. | `npx convex dev` |
| Convex **production** deployment | The live backend. Only updated by `npx convex deploy` (locally or from Vercel CI). Dashboard edits need confirmation. | `npx convex deploy` |
| Convex **preview** deployments | One throwaway backend per branch, auto-created by `npx convex deploy` when `CONVEX_DEPLOY_KEY` is a preview key. Expire after ~5 days. | automatic in CI |
| Vercel Production | Builds `main`, runs `convex deploy` first, then Next.js build against the prod backend. | `git push` |
| Vercel Preview | Builds each PR against its own Convex preview backend. | open a PR |

The question bank stays in git (`content/questions/*.json` = source of truth).
Convex holds the **published questions** (one doc per stable questionId).
The app plays from Convex.

## Local development

Prerequisites: `npx convex login` once (token lives in `~/.convex/`, never in the repo).

```bash
npx convex dev --once        # one-shot sync: pushes schema/functions, regenerates convex/_generated
npx convex dev               # watch mode (leave running in one terminal)
npm run dev                  # Next.js in another terminal
```

`npx convex dev` writes `.env.local` with `CONVEX_DEPLOYMENT` and
`NEXT_PUBLIC_CONVEX_URL`. Both are gitignored (`.env*` in `.gitignore`).
Never commit them, never put them in `.env.example` with real values.

`convex/_generated/` is generated code. It is committed so Vercel typechecks,
but never hand-edit it — `convex dev` / `convex deploy` regenerate it.

## Content publish pipeline (issue #27)

```bash
npm run validate                  # must pass before anything ships
npx tsx scripts/publish.mts       # syncs the bank to dev
npx tsx scripts/publish.mts --prod  # syncs the bank to prod
```

Rules:

- **A deletion is not live until you publish.** Removing an id from
  `content/questions/*.json` leaves it `published` in Convex, so it stays in the
  playable set. `questions:prune` (which `publish.mts` calls after `questions:sync`)
  is what archives it. Always publish after deleting, then confirm the row reads
  `archived`.
- Prune is a status change, not a delete: the row and its answer history stay, so
  answers already recorded against a retired id are not orphaned.
- Hard delete is opt-in and two-step: `questions:purgeArchived` refuses anything not
  already `archived`, so a live question cannot be destroyed by one mistake. Check
  `npx convex data questions --deployment <dev|prod> --limit 400` first. `publish.mts`
  never calls it.
- Publish only from a clean tree (`git status` clean).
- Sync is idempotent per `questionId`: inserts new rows, patches changed ones,
  archives published rows removed from git. Adding one question costs one write.
- Full-content fingerprint short-circuits unchanged banks (no write at all).
- Only `status: "published"` questions ship.
- Writes go through the internal `questions:sync` mutation via authenticated
  `npx convex run`, so publishing needs CLI login — the shipped client cannot
  write questions.

## Vercel wiring (one-time setup, then automatic)

Production:

1. Vercel → endless-ai → Settings → Build & Development → Build Command:
   `npx convex deploy --cmd 'npm run build'`
2. Convex dashboard → production deployment → Settings → generate a
   **Production** deploy key (`deployment:deploy` permission).
3. Vercel → Environment Variables → `CONVEX_DEPLOY_KEY` = that key,
   **Production only**.
4. `git push` to `main` → Vercel runs `convex deploy` (pushes backend to prod,
   exposes the prod URL to the build as `NEXT_PUBLIC_CONVEX_URL`), then builds.

Preview (per PR):

1. Convex dashboard → project Settings → generate a **Preview** deploy key.
2. Vercel → `CONVEX_DEPLOY_KEY` = that key, **Preview only**.
3. Optional: append `--preview-run '<fn>'` to seed fresh preview backends.

Steps 1-2 are not done yet. Until they are, previews fall back to the dev
backend (see below) rather than failing to build, which is enough to test a
frontend change from a phone.

Do not set `NEXT_PUBLIC_CONVEX_URL` manually in Vercel for production —
`convex deploy` provides it to the build. If the frontend ever needs a
differently named var, pass `--cmd-url-env-var-name <NAME>`.

## Preview builds without a preview backend

`buildCommand` in `vercel.json` is a three-way branch, because the two Vercel
environments have different jobs:

| Environment | `CONVEX_DEPLOY_KEY` | What builds |
| --- | --- | --- |
| Production | set (prod key) | `convex deploy` then Next.js, against the prod backend |
| Production | **missing** | build fails on purpose, rather than shipping a frontend with no backend |
| Preview | set (preview key) | `convex deploy` mints a throwaway preview backend per branch |
| Preview | **missing** | plain `npm run build` against `NEXT_PUBLIC_CONVEX_URL` from the environment, which points at **dev** |

That last row is the useful one. It means any PR gets a buildable, phone-
testable URL with no dashboard work, against the dev backend where the bank is
already published. The trade-off is that a preview writes to dev: signups,
answer events and profile edits from preview testing land in the dev backend
rather than a throwaway. Fine for a prototype, worth revisiting when previews
need to be isolated or seeded (`--preview-run`).

Setting the Preview env var:

```bash
vercel env add NEXT_PUBLIC_CONVEX_URL preview "" --value <dev convex url>
vercel env ls    # confirm which environment each key is scoped to
```


## Useful commands

```bash
npx convex dashboard                          # open backend in browser
npx convex data answerEvents --deployment dev # peek at a table (dev only)
npx convex logs                               # tail function logs
npx convex env list                           # backend env vars
vercel env ls                                 # frontend env vars
vercel ls                                     # recent deployments
gh issue list --repo miguelcorderocollar/endless-ai --state open
```

## Deploy checklist (before `git push`)

1. `npm run validate` (or `:offline` for speed, full before publish)
2. `npm run typecheck && npm run lint`
3. `npx convex deploy --dry-run` if backend changed
4. Push; watch Vercel deployment + Convex dashboard logs
