import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

/**
 * Unit tests only. Vitest's default glob matches any `.spec.ts` in the repo,
 * which includes the Playwright specs in `e2e/`, and it fails on them by
 * trying to run `test.describe` as if it were vitest's. The e2e suite runs
 * through `npm run test:e2e`, which builds the app and drives a real browser.
 */
export default defineConfig({
  resolve: {
    // Mirrors the `@/*` path in tsconfig.json, so a unit test can import the
    // same way the app does instead of counting directories to reach a sibling.
    alias: {
      "@shared": fileURLToPath(new URL("./src", import.meta.url)),
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    // `src` is the app; `convex` holds the backend, whose replay specs run
    // against an in-memory backend via convex-test. `e2e/` stays out (see
    // above) — Playwright specs fail collection under vitest on purpose.
    //
    // `apps/mobile` is the Expo build (#18) and contributes its pure helpers
    // only. Its screens are not unit tested: they are thin enough that the
    // browser suite and a device are the honest checks, and pulling RN
    // component tests into this runner would mean a second jsdom environment.
    include: [
      "src/**/*.test.ts",
      "convex/**/*.test.ts",
      "apps/mobile/src/**/*.test.ts",
    ],
  },
});
