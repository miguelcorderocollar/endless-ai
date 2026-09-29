# Deployment: Convex + Vercel

Source: [Convex Vercel hosting](https://docs.convex.dev/production/hosting/vercel.md),
[Multiple deployments](https://docs.convex.dev/production/multiple-deployments.md).
Convex CLI `1.46.0`, Vercel project `endless-ai` (`https://endless-ai-phi.vercel.app`).

## Mental model

| Piece | What it is | Command |
| --- | --- | --- |
| Convex **dev** deployment | Personal cloud backend per developer. `npx convex dev` pushes `convex/` code there and watches. | `npx convex dev` |
| Convex **production** deployment | The live backend. Only updated by `npx convex deploy` (locally or from Vercel CI). Dashboard edits need confirmation. | `npx convex deploy` |
| Convex **preview** deployments | One throwaway backend per branch, auto-created by `npx convex deploy` when `CONVEX_DEPLOY_KEY` is a preview key. Expire after ~5 days. | automatic in CI |
| Vercel Production | Builds `main`, runs `convex deploy` first, then Next.js build against the prod backend. | `git push` |
| Vercel Preview | Builds each PR against its own Convex preview backend. | open a PR |

The question bank stays in git (`content/questions/*.json` = source of truth).
Convex holds the **published snapshot** tagged with a content version.
The app plays from Convex, and every answer event records its content version.

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

## Content publish pipeline (issue #1)

```bash
npm run validate             # must pass before anything ships
npx tsx scripts/publish.mts  # upserts snapshot into the *currently selected* Convex deployment
```

Rules:

- Publish only from a clean tree (`git status` clean).
- Each publish creates a new content version (incrementing integer).
- Upsert is idempotent per `(contentVersion, questionId)` — re-running the same
  tree does not duplicate rows.
- Only `status: "published"` questions ship.
- Answer events always carry the content version they were played from.

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

Do not set `NEXT_PUBLIC_CONVEX_URL` manually in Vercel — `convex deploy`
provides it to the build. If the frontend ever needs a differently named var,
pass `--cmd-url-env-var-name <NAME>`.

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
