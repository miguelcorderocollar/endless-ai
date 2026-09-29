import { useEffect, useLayoutEffect } from "react";

/**
 * SSR-safe layout effect. localStorage cache reads must not run during
 * hydration render (server HTML has no cache, so client-first-render must
 * match it with null), but they must apply before paint to avoid a skeleton
 * flash. useLayoutEffect on the client does exactly that; on the server this
 * falls back to useEffect to avoid the SSR warning.
 */
export const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;
