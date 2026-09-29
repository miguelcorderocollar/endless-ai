/**
 * Update availability for long-lived tabs.
 *
 * The worker never takes over on its own (see the install note in
 * `public/sw.js`): a page running the previous bundle while its router fetches
 * next-build RSC payloads is a corrupt app. So a deploy leaves the new worker
 * parked in `waiting` until the last old tab closes — which, for a player who
 * keeps the quiz open, is never. This store surfaces that state so the UI can
 * offer a reload, and stays quiet otherwise.
 */

type UpdateState = { ready: boolean };

const IDLE: UpdateState = Object.freeze({ ready: false });
const READY: UpdateState = Object.freeze({ ready: true });

let current: UpdateState = IDLE;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function subscribeUpdate(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getUpdateSnapshot(): UpdateState {
  return current;
}

export function getUpdateServerSnapshot(): UpdateState {
  return IDLE;
}

export function markUpdateReady(): void {
  if (current === READY) return;
  current = READY;
  emit();
}

/**
 * Asks the waiting worker to take over, then reloads into the new shell once
 * it does. The navigation state is client-side and worthless to preserve
 * across a shell swap — the quiz resumes from the local bank, not from a
 * particular question, so a plain reload is the correct resume.
 *
 * If the worker activated between prompt display and click there is no
 * `waiting` left to message and no `controllerchange` coming: reload anyway
 * after a beat rather than dead-clicking. Either way the player asked for the
 * new version and gets it.
 */
export function applyUpdate(): void {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  let takenOver = false;
  const reload = () => {
    if (takenOver) return;
    takenOver = true;
    window.location.reload();
  };
  navigator.serviceWorker.addEventListener("controllerchange", reload, {
    once: true,
  });
  void navigator.serviceWorker.ready.then((registration) => {
    if (registration.waiting) {
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
    }
    window.setTimeout(reload, 2000);
  });
}
