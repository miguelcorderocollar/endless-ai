import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { encodePng, GRAIN_SIZE, grainPixels } from "./lib/grain.mts";

/**
 * Writes `apps/mobile/assets/images/grain.png`: the film grain `globals.css`
 * applies over the whole app, baked to a tileable PNG the phone can tile.
 *
 * The web version is an `feTurbulence` data URI and cannot be reused as one —
 * `react-native-svg` has no filters — so this regenerates the same noise
 * instead. Committed rather than generated per build, because a few tens of
 * kilobytes of noise should not be a build step that can fail, and because a
 * committed asset is diffable when it changes (it should not).
 *
 * Run with `npm run assets:grain` after touching the noise parameters in
 * `scripts/lib/grain.mts`.
 */
const projectRoot = new URL("..", import.meta.url).pathname;
const outPath = join(projectRoot, "apps", "mobile", "assets", "images", "grain.png");

const png = encodePng(grainPixels(GRAIN_SIZE), GRAIN_SIZE, GRAIN_SIZE);
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, png);

console.log(
  `Wrote ${GRAIN_SIZE}x${GRAIN_SIZE} grain tile (${Math.round(png.length / 1024)}kB) to ${outPath.replace(projectRoot, "")}`,
);
