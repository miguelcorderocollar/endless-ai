"use client";

import { useEffect } from "react";

/**
 * Registers `public/sw.js`. Renders nothing.
 *
 * Production only, and that is a hard requirement rather than caution. In
 * `next dev` the chunks are not content-hashed and are rebuilt on every edit,
 * so a cache-first worker pins the first version the browser ever saw and the
 * dev server appears to be serving stale code with no way to shake it loose
 * except a manual unregister. Registering from `public/` also means the script
 * itself is served verbatim with no build-time fingerprinting, which is why
 * the worker owns its cache version instead.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      void navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        // The worker is a plain static file, so let it hit the network every
        // time instead of trusting the HTTP cache for up to 24h. Otherwise a
        // fixed sw.js can sit behind an old copy and the update never lands.
        updateViaCache: "none",
      });
    };

    // Hydration can finish after `load` has already fired, in which case the
    // listener would never run.
    if (document.readyState === "complete") {
      register();
      return;
    }
    window.addEventListener("load", register);
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
