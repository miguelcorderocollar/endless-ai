import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { encodePng, GRAIN_SIZE, grainPixels } from "./lib/grain.mts";

/**
 * Writes the one committed image asset the Expo app carries:
 * `assets/images/grain.png`, the `body::after` film grain from `globals.css`.
 * The web version is an `feTurbulence` data URI and `react-native-svg`
 * implements no filters, so the same noise is regenerated rather than reused.
 *
 * It used to also write the blob sprite for the `AmbientBackground` backdrop.
 * That is gone from both apps — see `apps/mobile/src/components/Grain.tsx` for
 * why — so there is one asset now, committed rather than generated per build, because a few tens of
 * kilobytes of images should not be a build step that can fail, and because a
 * committed asset is diffable when it changes (they should not).
 *
 * Run with `npm run assets:grain` after touching the parameters in
 * `scripts/lib/grain.mts`.
 */
const projectRoot = new URL("..", import.meta.url).pathname;
const imageDir = join(projectRoot, "apps", "mobile", "assets", "images");
mkdirSync(imageDir, { recursive: true });

function write(name: string, pixels: Buffer, size: number): void {
  const png = encodePng(pixels, size, size);
  writeFileSync(join(imageDir, name), png);
  console.log(
    `Wrote ${size}x${size} ${name} (${Math.round(png.length / 1024)}kB)`,
  );
}

write("grain.png", grainPixels(GRAIN_SIZE), GRAIN_SIZE);