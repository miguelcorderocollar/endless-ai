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
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    // `src` is the app; `convex` holds the backend, whose replay specs run
    // against an in-memory backend via convex-test. `e2e/` stays out (see
    // above) — Playwright specs fail collection under vitest on purpose.
    include: ["src/**/*.test.ts", "convex/**/*.test.ts"],
  },
});
