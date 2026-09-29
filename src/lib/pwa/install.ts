/**
 * Install-prompt plumbing for the PWA build.
 *
 * A module-level store rather than React state: the `beforeinstallprompt`
 * event fires once, at a moment no component is guaranteed to be mounted, and
 * it must not be consumed by the first listener that happens to exist. Same
 * shape as `progress.ts`, so it composes with `useSyncExternalStore`.
 *
 * Two platforms, two mechanisms, and only one of them has an API:
 *
 * - Chromium fires `beforeinstallprompt` with a real prompt object we can open
 *   on demand. It is deliberately stingy about when: the manifest, a service
 *   worker with a fetch handler, HTTPS and some prior engagement are all
 *   required, so a fresh visitor may never get the event. Treat it as an
 *   upgrade, never as a precondition.
 * - iOS Safari has no such event and never will. The only route is Share →
 *   Add to Home Screen, so there the UI shows instructions instead of a button
 *   that would do nothing.
 */

const DISMISS_KEY = "endless-ai:install-dismissed:v1";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export type InstallState = {
  /** Launched from the home screen: there is nothing left to offer. */
  installed: boolean;
  /** A Chromium prompt object is waiting to be opened. */
  canPrompt: boolean;
  /** iOS, not installed: instructions, not a button. */
  needsIOSInstructions: boolean;
  /** Android or desktop Chromium that has not handed us a prompt yet. */
  needsManualInstructions: boolean;
  /** The player said no and should not be asked again. */
  dismissed: boolean;
};

/**
 * A fresh frozen object per change, never mutated in place.
 * `useSyncExternalStore` compares snapshots with `Object.is`, so returning a
 * rebuilt object on every read would re-render forever.
 */
const UNKNOWN: InstallState = Object.freeze({
  installed: false,
  canPrompt: false,
  needsIOSInstructions: false,
  needsManualInstructions: false,
  dismissed: false,
});

let current: InstallState = UNKNOWN;

const listeners = new Set<() => void>();

let deferred: BeforeInstallPromptEvent | null = null;
let started = false;

function set(patch: Partial<InstallState>) {
  const next = Object.freeze({ ...current, ...patch });
  if (
    next.installed === current.installed &&
    next.canPrompt === current.canPrompt &&
    next.needsIOSInstructions === current.needsIOSInstructions &&
    next.needsManualInstructions === current.needsManualInstructions &&
    next.dismissed === current.dismissed
  ) {
    return;
  }
  current = next;
  for (const listener of listeners) listener();
}

export function subscribeInstall(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getInstallSnapshot(): InstallState {
  return current;
}

/**
 * Frozen and always the same on both sides of hydration. The real values are
 * discovered in an effect, one render later, which is invisible.
 */
export function getInstallServerSnapshot(): InstallState {
  return UNKNOWN;
}

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  // iPadOS 13+ reports itself as a Mac; touch points are what give it away.
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/** Touch input: a phone or tablet, which is where installing is worth offering. */
export function isTouchDevice(): boolean {
  return typeof navigator !== "undefined" && navigator.maxTouchPoints > 0;
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return (
    nav.standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches
  );
}

/**
 * Starts listening. Idempotent, and safe to call from a component that mounts
 * more than once. Nothing here renders, so there is no hydration hazard: the
 * first client render always sees the inert server snapshot and the real
 * values land in the effect right after.
 */
export function startInstallListener(): void {
  if (started || typeof window === "undefined") return;
  started = true;

  let dismissed = false;
  try {
    dismissed = window.localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    /* private mode: treat as not dismissed, the prompt is a nicety */
  }

  const installed = isStandalone();
  set({
    dismissed,
    installed,
    needsIOSInstructions: !installed && isIOS(),
    // Desktop browsers get no banner: the menu path differs per browser and
    // the profile row already covers anyone who asks. Only phones and tablets
    // have a menu worth walking them through.
    needsManualInstructions: !installed && !isIOS() && isTouchDevice(),
  });

  if (installed) return;

  window.addEventListener("beforeinstallprompt", (event) => {
    // Chrome offers a tiny banner of its own for some installs; we would
    // rather own the affordance, so suppress it and keep the event.
    event.preventDefault();
    deferred = event as BeforeInstallPromptEvent;
    set({ canPrompt: true, needsManualInstructions: false });
  });

  window.addEventListener("appinstalled", () => {
    deferred = null;
    set({ installed: true, canPrompt: false, needsManualInstructions: false });
  });

  // Leaving fullscreen/standalone (an Android user swiping the app away to
  // the browser) puts the offer back on the table.
  const query = window.matchMedia("(display-mode: standalone)");
  query.addEventListener("change", () => set({ installed: isStandalone() }));
}

/** Opens the deferred prompt. Returns false when there was nothing to open. */
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  const event = deferred;
  deferred = null;
  set({ canPrompt: false });
  await event.prompt();
  const { outcome } = await event.userChoice;
  if (outcome === "accepted") set({ installed: true });
  return true;
}

/** Remembers the refusal. The profile keeps a permanent way back. */
export function dismissInstall(): void {
  try {
    window.localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    /* nothing we can do, and it is not worth surfacing */
  }
  set({ dismissed: true });
}

export function resetInstallDismissal(): void {
  try {
    window.localStorage.removeItem(DISMISS_KEY);
  } catch {
    /* same */
  }
  set({ dismissed: false });
}
