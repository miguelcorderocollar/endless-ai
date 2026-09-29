# Deployment: Convex + Vercel

Source: [Convex Vercel hosting](https://docs.convex.dev/production/hosting/vercel.md),
[Multiple deployments](https://docs.convex.dev/production/multiple-deployments.md).
Convex CLI `1.46.0`, Vercel project `endless-ai` (`https://endless-ai-quiz.vercel.app`).

## Deployment identities

Name the targets before running a command against one. Most incident reports
here are a command aimed at the wrong backend, and both backends answer.

| Target | Name | How it is selected |
| --- | --- | --- |
| Convex dev | `careful-salmon-552` | `CONVEX_DEPLOYMENT` in `.env.local` |
| Convex production | `moonlit-blackbird-812` | `--prod`, or the `CONVEX_DEPLOY_KEY` in Vercel |
| Vercel production | `endless-ai` at `https://endless-ai-quiz.vercel.app` | builds `main` |
| Convex project | `mikelon797:ai-endless-quiz` | `npx convex login` |

`npx convex run ... --prod` resolves the production deployment from your CLI
login, not from `.env.local`, which only ever points at dev. There is no
read-only command that lists deployments, so confirm with a harmless call before
acting:

```bash
npx convex run questions:list '{}' --prod   # read-only
```

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
  `archived`. Git looking correct proves nothing here.
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

## Skipping builds for non-app pushes (`ignoreCommand`)

`vercel.json` sets an `ignoreCommand`, so a push that only touches `docs/`,
`data/`, or any `*.md` cancels instead of building:

```
git diff --quiet "${VERCEL_GIT_PREVIOUS_SHA:-HEAD^}" HEAD -- . \
    ':(exclude)docs' ':(exclude)data' ':(exclude)*.md'
```

Exit-code semantics are inverted from intuition: **exit 0 skips the build**
(the deployment ends as `CANCELED`), **exit 1 builds**. The diff anchor is
`VERCEL_GIT_PREVIOUS_SHA`, the last *successful* deployment for this branch —
Vercel exposes that variable only because an ignore step is set — so a push of
several commits is judged against the last shipped state instead of only the
tip commit's own diff. On a branch's first deployment the variable is empty and
the command falls back to `HEAD^`; if git itself errors, the exit code is ≥1,
which builds. Every failure mode builds rather than skips.

Two things to know:

- **Canceled builds still count** against the deployment quota and concurrent
  build slots. This saves the `convex deploy` + Next build time, not quota.
- **`content/` is deliberately not excluded.** Nothing in the build reads it on
  `main` today — the bank reaches Convex through `scripts/publish.mts`, not
  Vercel — but the offline bank bundle on the `pwa-offline-outbox` branch
  (`src/lib/questions/bankBundle.ts`, generated from `content/` inside
  `next.config.ts`) makes `content/` a build input: skipping a content-only
  push there would ship a stale offline fallback. If that stops being true,
  change the pathspec in `vercel.json`, not the dashboard — the file is the
  reviewed source of truth for this command.

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

## What a push actually ships

`git push` to `main` sends **every** file under `convex/` to production, because
Vercel's build command is `npx convex deploy --cmd 'npm run build'`. It does not
push uncommitted work, so a half-finished function only reaches prod if it was
committed. Conversely, `npx convex dev --once` and `npx convex deploy` both send
the whole directory, so stray staged changes in other `convex/` files ride along
with the one you meant to ship.

Two consequences worth remembering:

- A new mutation is available on prod as soon as a commit that adds it lands on
  `main`. You do not need a separate deploy step, and you cannot deploy it alone.
- `npx convex deploy` prompts before pushing to production. In a non-interactive
  shell it refuses rather than guessing, which is the behaviour you want. Run it
  from a terminal when you mean it.

`publish.mts` is content only. It never calls `convex deploy`, so publishing the
bank does not move backend code.

## The native build (`apps/mobile`, issue #18)

A third target, and the only one whose backend URL cannot be changed after the
fact. Add it to the identities table when it actually ships:

| Target | How the backend is selected |
| --- | --- |
| Expo dev build | `EXPO_PUBLIC_CONVEX_URL` in `apps/mobile/.env` (gitignored) |
| Play release | inlined at build time by Metro — **there is no runtime override** |

`EXPO_PUBLIC_*` is a string-substituted constant, not a read at launch. Once an
APK is built, the Convex deployment is part of the binary, and shipping a
corrected one means shipping a new build. So a release profile must set
`EXPO_PUBLIC_CONVEX_URL` to the **production** host (`moonlit-blackbird-812`),
not the dev one — an APK pointed at `careful-salmon-552` is a public app reading
and writing dev data that a later deploy can erase. `apps/mobile/src/lib/backend.ts`
logs an error when a non-`__DEV__` bundle carries a `.convex.cloud` URL, which
catches the mistake at build time rather than in review.

Nothing else about the native app is a deployment concern: EAS Build compiles in
the cloud, so there is no Android SDK on this machine and no native folder to
commit. The Play listing itself is the $25 account plus the content rating and
data safety forms, and none of that is set up yet.

## Deploy checklist (before `git push`)

1. `npm run validate` (or `:offline` for speed, full before publish)
2. `npm run typecheck && npm run lint`
3. `npx convex deploy --dry-run` if backend changed
4. Push; watch Vercel deployment + Convex dashboard logs
