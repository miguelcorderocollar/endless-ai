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
  // Read the real value on first contact, not just in the effect: a cold
  // offline boot would otherwise draw once as online — and a parked Convex
  // query never comes back to correct it. Idempotent; duplicate listener
  // registration is a no-op by DOM contract, and `sync` only notifies on
  // change, so repeated reads during render are free.
  if (typeof window !== "undefined" && !started) startNetworkListener();
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
