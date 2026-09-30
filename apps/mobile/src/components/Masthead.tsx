import { useConvexAuth, useQuery } from "convex/react";
import { router } from "expo-router";
import { useEffect, useSyncExternalStore } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { me } from "@/lib/api";
import { rememberProfile } from "@/lib/account";
import { readProfileCache, subscribeCaches } from "@/lib/profileCache";
import { SyncStatus } from "@/components/SyncStatus";
import { colors, fonts, label } from "@/theme";

/**
 * The quiz masthead from `src/components/Quiz.tsx`, with the same affordances:
 * the wordmark home, the sync status, the live Elo, and a way into categories
 * and the profile. On the web the last two are text links and an inline SVG;
 * native needs a target area, so they get hit slop and the gear becomes a
 * labelled button.
 *
 * The account slot is the one addition the web does not need here: a PWA
 * already had a session by the time you noticed, whereas a fresh install is a
 * guest. It says "sign in" until there is an identity, then the handle, so the
 * state is never ambiguous.
 *
 * The name comes from the cache first, the way the web's does (`bankCache.ts`):
 * a returning player should not watch their own name flash to "sign in" while
 * `users.me` revalidates.
 */
export function Masthead({ rating }: { rating: number }) {
  const { isAuthenticated } = useConvexAuth();
  const identity = useQuery(me, isAuthenticated ? {} : "skip");
  const cached = useSyncExternalStore(
    subscribeCaches,
    readProfileCache,
    readProfileCache,
  );

  useEffect(() => {
    if (identity) rememberProfile(identity);
  }, [identity]);

  const name = cached?.displayName ?? cached?.handle ?? null;

  return (
    <View style={styles.bar}>
      <Pressable
        onPress={() => router.push("/")}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Endless AI Quiz, back to the quiz"
        style={styles.wordmark}
      >
        <Text style={styles.brand}>
          Endless <Text style={styles.accent}>AI</Text>
        </Text>
      </Pressable>

      <View style={styles.right}>
        <SyncStatus />
        <Text style={styles.elo}>
          elo <Text style={styles.eloValue}>{rating}</Text>
        </Text>
        <Pressable
          onPress={() => router.push("/categories")}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Categories"
        >
          <Text style={styles.link}>cats</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push(name ? "/profile" : "/account")}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={
            name ? `Signed in as ${name}. Profile` : "Sign in"
          }
        >
          <Text style={[styles.link, styles.account]}>
            {isAuthenticated ? (name ?? "you") : "sign in"}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => router.push("/profile")}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Profile and stats"
        >
          {/* The web app's inline settings gear. */}
          <Text style={styles.gear}>⚙</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.inkLine,
    paddingVertical: 16,
  },
  wordmark: { flexShrink: 1 },
  brand: {
    fontFamily: fonts.display,
    fontSize: 26,
    color: colors.paper,
    letterSpacing: -0.3,
  },
  accent: { color: colors.signal },
  right: { flexDirection: "row", alignItems: "center", gap: 16 },
  elo: { ...label, color: colors.muted },
  eloValue: { fontFamily: fonts.mono, fontSize: 14, color: colors.paper },
  link: { ...label, color: colors.muted },
  account: { color: colors.signal },
  gear: { fontSize: 17, color: colors.muted, lineHeight: 20 },
});
