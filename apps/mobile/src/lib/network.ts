import { useEffect, useSyncExternalStore } from "react";
import NetInfo from "@react-native-community/netinfo";

/**
 * Online/offline as an external store — the native counterpart of
 * `src/lib/pwa/network.ts`, and deliberately the same shape (`{ online }`,
 * `subscribe`, `getSnapshot`, `getServerSnapshot`) so the masthead chip on both
 * platforms is the same code shape and the same labels.
 *
 * What changes is the source. The web reads `navigator.onLine`, which the
 * browser keeps current for free. React Native has no equivalent, so this
 * subscribes to NetInfo, which is the platform's connectivity signal. Neither
 * can tell a captive portal from the real internet, which is exactly why the
 * outbox drains on failure rather than on the value here: this flag steers the
 * UI and the fast paths, never the source of truth.
 *
 * NetInfo reports `isInternetReachable === null` while it is still probing. The
 * flag starts optimistic (`online: true`) and only flips to false once NetInfo
 * has actually said so, because a cold offline boot that renders "online" and
 * never corrects itself is the failure mode — the same reasoning as
 * `getNetworkSnapshot` reading the real value on first contact.
 */
type NetworkState = { online: boolean };

const ONLINE: NetworkState = Object.freeze({ online: true });
const OFFLINE: NetworkState = Object.freeze({ online: false });

let current: NetworkState = ONLINE;
let unsubscribe: (() => void) | null = null;

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

function set(next: NetworkState): void {
  if (next === current) return;
  current = next;
  for (const listener of listeners) listener();
}

/**
 * Idempotent, like the web's `startNetworkListener`: the root layout calls it
 * once so the value is live before anything reads it, and any component can
 * call it again without stacking subscriptions.
 */
export function startNetworkListener(): void {
  if (unsubscribe) return;
  unsubscribe = NetInfo.addEventListener((state) => {
    // A null `isConnected` means NetInfo has no answer yet, not "offline".
    if (state.isConnected === null) return;
    set(state.isConnected === false ? OFFLINE : ONLINE);
  });
}

/** The masthead's sync chip: `offline`, `N unsynced`, or nothing. */
export function useNetwork(): boolean {
  return useSyncExternalStore(
    subscribeNetwork,
    getNetworkSnapshot,
    getNetworkServerSnapshot,
  ).online;
}

/** Starts listening on mount and stops on unmount, for a single screen. */
export function useNetworkStarted(): boolean {
  const online = useNetwork();
  useEffect(() => {
    startNetworkListener();
  }, []);
  return online;
}
