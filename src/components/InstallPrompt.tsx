"use client";

import { useEffect, useSyncExternalStore } from "react";

import {
  dismissInstall,
  getInstallServerSnapshot,
  getInstallSnapshot,
  type InstallState,
  promptInstall,
  startInstallListener,
  subscribeInstall,
} from "@/lib/pwa/install";
import {
  getProgressServerSnapshot,
  getProgressSnapshot,
  subscribeProgress,
} from "@/lib/progress";

/**
 * Install affordances for the PWA build. Two placements, one store:
 *
 * - `InstallBanner` sits under the quiz, and only for someone who has already
 *   answered enough questions to plausibly want the app. The original never
 *   nags, and an install prompt aimed at a first-time visitor is exactly the
 *   kind of thing that loses them. One "no" and it never comes back.
 * - `InstallRow` lives on the profile, where a player who wants it goes to
 *   look. Never dismissed, always available.
 */

const BANNER_MIN_ANSWERED = 10;

function useInstall(): InstallState {
  useEffect(startInstallListener, []);
  return useSyncExternalStore(
    subscribeInstall,
    getInstallSnapshot,
    getInstallServerSnapshot,
  );
}

/** The button, or the platform's manual route when there is no API to call. */
function InstallActions({ state }: { state: InstallState }) {
  if (state.canPrompt) {
    return (
      <button
        type="button"
        onClick={() => void promptInstall()}
        className="label shrink-0 cursor-pointer border border-signal bg-signal px-5 py-2.5 text-ink transition-colors hover:border-paper hover:bg-paper"
      >
        install
      </button>
    );
  }

  if (state.needsIOSInstructions) {
    return (
      <p className="text-sm leading-relaxed text-muted">
        Tap <span className="text-paper">Share</span>, then{" "}
        <span className="text-paper">Add to Home Screen</span>.
      </p>
    );
  }

  return (
    <p className="text-sm leading-relaxed text-muted">
      Open the browser menu and choose{" "}
      <span className="text-paper">Install app</span>.
    </p>
  );
}

export function InstallBanner() {
  const state = useInstall();
  const progress = useSyncExternalStore(
    subscribeProgress,
    getProgressSnapshot,
    getProgressServerSnapshot,
  );

  if (state.installed || state.dismissed) return null;
  if (progress.answered < BANNER_MIN_ANSWERED) return null;
  if (!state.canPrompt && !state.needsIOSInstructions && !state.needsManualInstructions) {
    return null;
  }

  return (
    <div className="rise mt-10 border-t border-ink-line pt-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm leading-relaxed text-muted">
          Put it on your home screen. It opens fullscreen and works offline.
        </p>
        <div className="flex shrink-0 items-center gap-3">
          <InstallActions state={state} />
          <button
            type="button"
            onClick={dismissInstall}
            aria-label="dismiss install prompt"
            className="label cursor-pointer text-muted transition-colors hover:text-fail"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}

export function InstallRow() {
  const state = useInstall();
  if (state.installed) return null;

  return (
    <div className="mt-8 border-t border-ink-line pt-6">
      <p className="label text-muted">app</p>
      <div className="mt-3 flex items-center justify-between gap-4">
        <p className="max-w-xs text-sm leading-relaxed text-muted">
          Launch from your home screen: fullscreen, no browser chrome, and the
          quiz keeps working without a connection.
        </p>
        <InstallActions state={state} />
      </div>
    </div>
  );
}
