/// <reference types="vite/client" />

/**
 * Convex typechecks `convex/` with its own tsconfig on every deploy, and that
 * project has no Vite types — so `import.meta.glob` in `convex/*.test.ts`
 * (the canonical convex-test module map) fails the deploy typecheck while
 * passing the app's. This reference is type-only: nothing here ships to the
 * backend.
 */
export {};
