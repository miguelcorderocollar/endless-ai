import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { GearIcon } from "@/components/icons";
import { SyncStatus } from "@/components/SyncStatus";
import { colors, fonts, label } from "@/theme";

/**
 * The quiz masthead from `src/components/Quiz.tsx`: the wordmark home, the sync
 * status, the live Elo, `cats`, and the settings gear. Five things, the same
 * five the web has.
 *
 * The first pass of this added a sixth — the signed-in name, or "sign in" for a
 * guest — on the reasoning that a fresh install is a guest and the state should
 * never be ambiguous. It was not ambiguous on the web, because the profile
 * carries the identity and the sign-in CTA, so the slot was a guess at a need
 * nobody had. Dropping it is what makes the two mastheads the same object.
 */
export function Masthead({ rating }: { rating: number }) {
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
          onPress={() => router.push("/profile")}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Profile and stats"
          style={styles.gearHit}
        >
          <GearIcon stroke={colors.muted} />
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
  // The web's gear sits on a bare button with no padding; hitSlop does the
  // reaching, so the icon can be the web's 17px rather than a padded 44dp one.
  gearHit: { paddingVertical: 2 },
});
