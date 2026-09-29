# Parity with the web app — what the native build still lacks

The goal is that the Android app is the same product as the web app, not a
smaller cousin. This is the honest gap list, split by whether a difference is
deliberate or just unfinished.

## Deliberately different, and should stay that way

| Web | Native | Why |
| --- | --- | --- |
| Keyboard play: `1-4`/`A-D` to answer, arrows to move, `Enter` to advance, `?` for Learn (#26) | Tap only | A phone has no keyboard. Worth a `VolumeUp`-style shortcut someday; not parity work. |
| `InstallBanner` (#17) | — | The app *is* installed. The PWA prompt is meaningless here. |
| `UpdatePrompt` (#17) | — | Native updates come through the store or EAS Update, not a service-worker diff. |
| `manifest.shortcuts` long-press | Android app shortcuts | Not implemented; a later nicety. |
| Service worker, network-first shell | — | Same reason. |

## Missing, and it is real work

Ordered by how much the gap shows.

1. **Play the full bank offline.** No bundled bank on native, so the first
   question needs the connection. The web generates one in `next.config.ts` via
   `src/lib/questions/bankBundle.ts`; the native version wants a generated JSON
   asset validated by the same `questionSchema`, not a second validator.
2. **Queue answers and sync on reconnect.** The outbox in
   `src/lib/answers/outbox.ts` is localStorage-based. This needs the same
   exact-replay semantics against AsyncStorage: `eventId` dedupe, record order,
   stop at first failure. Without it a bad connection drops the sync, and
   `syncOnSignIn` has nothing to replay.
3. **Sync status in the masthead.** The web shows a `SyncStatus` indicator
   (`src/components/SyncStatus.tsx`). It cannot exist until 1 and 2 do.
4. **Elo graph.** `EloChart` in `src/components/Stats.tsx`. The native profile
   shows a number, not a history.
5. **Per-category accuracy bars.** `myStats.byCategory` already carries the
   data server-side, and the native profile ignores it. This is close to free
   once the profile reads server stats properly.
6. **Distribution / percentile.** `Distribution` in the same file, plus the
   population query behind it. Gated on there being a logged-in population
   (#2's own note), so it may legitimately be empty for a while.
7. **Done list as a browsable list.** The web has `DoneList.tsx`; native shows
   a count and a disclosure of *misses* only.
8. **Display name and handle editing.** The web profile edits `displayName` via
   a `Popup` and shows the handle. Native shows whichever the server returns and
   offers no way to change it.
9. **Best streak.** `myStats.bestStreak` exists server-side; not surfaced.
10. **Ambience.** `AmbientBackground` and the film-grain overlay in
    `globals.css` have no native equivalent. The grain is a `feTurbulence` data
    URI, which `react-native-svg` cannot render, so matching it needs either a
    generated noise texture or accepting its absence.

## Native-only, and worth keeping

- **Haptics on every answer** (`expo-haptics`). The web cannot do this.
- **Real safe-area handling** via `react-native-safe-area-context`, rather than
  `env(safe-area-inset-*)` CSS.

## What is already at parity

- The quiz loop: draw, answer, immediate reveal, explanation, Learn link.
- Elo, locally and reconciled to the server when signed in.
- Category filter, including the fun-mode "does not affect Elo" rule.
- Sign in / sign up / sign out, and the guest-to-account claim.
- Typography and palette: the same Instrument Serif, IBM Plex Sans and Mono,
  and the same `ink`/`paper`/`signal` values as `globals.css`.

## Suggested order

1 → 2 → 3 together, since 3 is only visible once the other two work. Then 4, 5
and 9, which are all reads of data the server already has. Then 7 and 8. 6 last,
because it is only meaningful with real population.
