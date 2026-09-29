# Endless AI Quiz (native)

The Expo / React Native build of the quiz, for issue #18. Same bank, same Elo,
same draw as the web app — a native shell over the shared logic, not a rewrite
of it.

## What is shared and what is not

| Shared, imported from `../../src` | Reimplemented here |
| --- | --- |
| `src/lib/quiz/elo.ts` — ratings, tiers, `scoreAnswer` | Storage: `src/lib/progress.ts` (AsyncStorage, mirrors the web's localStorage module) |
| `src/lib/quiz/engine.ts` — `pickNext`, Elo-matched weighting | Views: the three screens in `src/app` |
| `src/lib/questions/schema.ts` — `CATEGORIES`, `questionSchema`, source links | Backend calls: `src/lib/api.ts` (see below) |
| `src/lib/progress.ts` — the `SavedProgress` **type** and `RECENT_CAP` | |

`@shared/*` in `tsconfig.json` and the shared config in the app's `metro.config.js`
are what make those imports resolve. Nothing under `src/lib/quiz` or
`src/lib/questions` is copied — if the two drift, one of them is wrong and the
typechecker or the unit tests should say so.

`src/lib/api.ts` is the one deliberate exception. It declares the two Convex
functions this app calls client-side instead of importing the generated `api`,
because the generated types drag in the whole Node backend and Expo types
`process.env` for a client. The comment in that file spells out the trade.

## Running it

There is no Android SDK requirement for a dev build — Expo Go runs the JS, and
EAS Build compiles in the cloud. You need the backend URL:

```bash
cp .env.example .env          # then set EXPO_PUBLIC_CONVEX_URL
npm install
npm run android               # or: npm start, then scan the QR with Expo Go
```

To point at whatever `npx convex dev` is using, copy `NEXT_PUBLIC_CONVEX_URL`
from the repo root's `.env.local`.

Other scripts: `npm run typecheck`, `npm run ios` (needs a Mac or a device with
Expo Go), `npm run web` (react-native-web, useful for a quick look without a
phone).

## What is not done yet

Scoped deliberately — this is the "playable first" pass, so the app is
something you can actually hold and use before anything else gets built.

- **No offline play.** The first question needs the connection, because there is
  no bundled bank here yet. The web app bakes one in (`src/lib/questions/bankBundle.ts`
  → `public/bank.json`); the native equivalent is a generated JSON asset, and it
  should reuse the same validator rather than inventing a second one.
- **No answer outbox.** The web queues answers offline and replays them
  (`src/lib/answers/outbox.ts`). This app scores locally and drops the sync. It
  needs its own AsyncStorage-backed queue with the same exact-replay semantics
  (`eventId` dedupe, stop-at-first-failure ordering) — reimplementing it against
  AsyncStorage is the substantial part of the next pass, and the reason the
  shared lib earns its keep.
- **No auth, no server Elo.** Progress is local and the profile says so.
- **No category breakdown in the profile.** The local ring buffer stores
  question ids, not categories.

## Release path

Nothing here is published. When it is: `eas build -p android --profile
production` produces a signed AAB for Play. Two things to get right first, both
in `src/lib/backend.ts` and `docs/deployment.md`:

1. `EXPO_PUBLIC_CONVEX_URL` is inlined into the binary. A release build pointed
   at the dev deployment ships a public app reading disposable dev data. The
   code logs an error for exactly this, but the real fix is the build profile.
2. The Play listing needs a $25 account, a content rating form, a data safety
   form and a target SDK. The icon and adaptive icon are already generated from
   `public/icons/app-icon.svg` by `rsvg-convert`.
