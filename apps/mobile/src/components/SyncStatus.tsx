import { useConvexAuth } from "convex/react";
import { useEffect, useSyncExternalStore } from "react";
import { StyleSheet, Text } from "react-native";

import { answer as answerRef } from "@/lib/api";
import { convexClient } from "@/lib/backend";
import {
  getNetworkServerSnapshot,
  getNetworkSnapshot,
  startNetworkListener,
  subscribeNetwork,
} from "@/lib/network";
import {
  drainOutbox,
  getOutboxServerSnapshot,
  getOutboxSnapshot,
  shouldReconcile,
  subscribeOutbox,
} from "@/lib/outbox";
import { readProfileCache } from "@/lib/profileCache";
import { getProgress, updateProgress } from "@/lib/progress";
import { label } from "@/theme";

/**
 * The native counterpart of `src/components/SyncStatus.tsx`: the same two
 * exports for the same two reasons, and the same strings, so the two apps say
 * the same thing about the same state.
 *
 * `OutboxFlusher` renders nothing and keeps the outbox draining for as long as
 * the app is open: on mount, when the network returns mid-session, and when the
 * auth state settles after a sign-in. It lives in the root layout rather than a
 * screen, which is the one structural difference from the web — a phone moves
 * between four screens and the queue has to survive all of them, where the web
 * mounts a flusher per route. A drain against an empty queue is a no-op, so
 * re-running is free.
 */
export function OutboxFlusher() {
  const { isAuthenticated } = useConvexAuth();
  const client = convexClient();
  const network = useSyncExternalStore(
    subscribeNetwork,
    getNetworkSnapshot,
    getNetworkServerSnapshot,
  );

  useEffect(() => {
    startNetworkListener();
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !network.online || !client) return;
    const account = readProfileCache()?.handle ?? null;
    void drainOutbox((args) => client.mutation(answerRef, args), account).then(
      ({ sent, lastRating, maxAt }) => {
        if (sent > 0 && lastRating !== null && shouldReconcile(maxAt)) {
          updateProgress({ ...getProgress(), rating: lastRating });
        }
      },
    );
  }, [isAuthenticated, network.online, client]);

  return null;
}

/**
 * The difference between "playing" and "synced", in one label. Silent when
 * everything has landed; `offline` when the network is gone, `N unsynced` when
 * answers are parked in the outbox, both when they coincide.
 */
export function SyncStatus() {
  useEffect(() => {
    startNetworkListener();
  }, []);
  const online = useSyncExternalStore(
    subscribeNetwork,
    getNetworkSnapshot,
    getNetworkServerSnapshot,
  ).online;
  const unsynced = useSyncExternalStore(
    subscribeOutbox,
    getOutboxSnapshot,
    getOutboxServerSnapshot,
  ).pending.length;

  if (online && unsynced === 0) return null;

  const parts: string[] = [];
  if (!online) parts.push("offline");
  if (unsynced > 0) parts.push(`${unsynced} unsynced`);

  return (
    <Text
      style={styles.chip}
      accessibilityRole="text"
      accessibilityLabel={parts.join(", ")}
    >
      {parts.join(" · ")}
    </Text>
  );
}

const styles = StyleSheet.create({
  // `text-muted/70` on the web, which is this alpha over ink.
  chip: { ...label, color: "rgba(111,117,128,0.7)" },
});
