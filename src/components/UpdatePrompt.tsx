"use client";

import { useSyncExternalStore } from "react";

import { applyUpdate, getUpdateServerSnapshot, getUpdateSnapshot, subscribeUpdate } from "@/lib/pwa/update";

/**
 * The `SKIP_WAITING` handshake, surfaced. Shows only while a newer worker is
 * parked in `waiting` — i.e. a deploy landed while the player had the app
 * open. The copy says what happens (a reload) because losing a mid-question
 * screen with no warning would be worse than the stale shell.
 */
export function UpdatePrompt() {
  const update = useSyncExternalStore(
    subscribeUpdate,
    getUpdateSnapshot,
    getUpdateServerSnapshot,
  );

  if (!update.ready) return null;

  return (
    <div className="rise mt-10 border-t border-ink-line pt-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm leading-relaxed text-muted">
          A new version is ready. It takes over on reload.
        </p>
        <button
          type="button"
          onClick={applyUpdate}
          className="label shrink-0 cursor-pointer border border-signal bg-signal px-5 py-2.5 text-ink transition-colors hover:border-paper hover:bg-paper"
        >
          reload
        </button>
      </div>
    </div>
  );
}
