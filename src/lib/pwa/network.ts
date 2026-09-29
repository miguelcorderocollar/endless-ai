/**
 * Online/offline as an external store, same shape as the install store.
 *
 * `navigator.onLine` is the coarse signal the app needs: the quiz distinguishes
 * "send it now" from "queue it", and the masthead tells the player which one
 * is happening. It cannot tell a captive portal from the real internet, which
 * is exactly why the outbox drains on failure rather than on the value here —
 * this flag steers the UI and the fast paths, never the source of truth.
 */

type NetworkState = { online: boolean };

const ONLINE: NetworkState = Object.freeze({ online: true });
const OFFLINE: NetworkState = Object.freeze({ online: false });

let current: NetworkState = ONLINE;
let started = false;

const listeners = new Set<() => void>();

export function subscribeNetwork(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getNetworkSnapshot(): NetworkState {
  return current;
}

export function getNetworkServerSnapshot(): NetworkState {
  return ONLINE;
}

/** Idempotent; safe from any component that renders on every route. */
export function startNetworkListener(): void {
  if (started || typeof window === "undefined") return;
  started = true;

  const sync = () => {
    const next = navigator.onLine ? ONLINE : OFFLINE;
    if (next === current) return;
    current = next;
    for (const listener of listeners) listener();
  };

  sync();
  window.addEventListener("online", sync);
  window.addEventListener("offline", sync);
}
