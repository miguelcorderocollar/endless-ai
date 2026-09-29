import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";
import { router } from "expo-router";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { me, myCompleted, myStats } from "@/lib/api";
import {
  EMPTY_PROGRESS,
  getProgress,
  hasHydrated,
  hydrateProgress,
  subscribeProgress,
} from "@/lib/progress";
import { tierFor } from "@shared/lib/quiz/elo";
import { BOTTOM_INSET, colors, fonts, GUTTER, label } from "@/theme";

/**
 * Two sources of truth, and which one wins depends on sign-in state.
 *
 * A guest sees device-local totals, because that is all they have (#2: guests
 * play instantly, zero friction, local Elo only). A signed-in player sees the
 * materialized server rollup (#34), which is the same numbers the web shows and
 * the ones that follow you between devices — the device cache is reconciled to
 * them on sign-in by `lib/account.ts`, so the two agree anyway. Reading the
 * local values here while signed in would be a lie the moment you used two
 * phones, so the branch is explicit.
 */
export default function ProfileScreen() {
  const local = useSyncExternalStore(
    subscribeProgress,
    hasHydrated() ? getProgress : () => EMPTY_PROGRESS,
    () => EMPTY_PROGRESS,
  );
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signOut } = useAuthActions();
  const [open, setOpen] = useState(false);

  const identity = useQuery(me, isAuthenticated ? {} : "skip");
  const stats = useQuery(myStats, isAuthenticated ? {} : "skip");
  const completed = useQuery(myCompleted, isAuthenticated ? {} : "skip");

  useEffect(() => {
    void hydrateProgress();
  }, []);

  // Server truth when signed in, device truth when not. `myStats` is null
  // before a player's first answer, so fall back to the device numbers for a
  // fresh account rather than showing zeros next to a seeded rating.
  const rating = isAuthenticated ? (stats?.rating ?? local.rating) : local.rating;
  const answered = isAuthenticated ? (stats?.answered ?? local.answered) : local.answered;
  const correct = isAuthenticated ? (stats?.correct ?? local.correct) : local.correct;
  const streak = isAuthenticated ? (stats?.streak ?? local.streak) : local.streak;
  const doneList = isAuthenticated ? (completed ?? local.completed) : local.completed;

  const rate = answered === 0 ? 0 : correct / answered;
  const name = identity?.displayName ?? identity?.handle ?? null;

  // The recent ring buffer stores ids, not categories, so this screen reports
  // the misses it can actually name and leaves per-category bars to the
  // offline pass, which is where the answer events start carrying categories.
  const misses = local.recent.filter((r) => !r.correct).slice(-10).reverse();

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.frame}>
        <View style={styles.bar}>
          <Text style={styles.title}>Your profile</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to the quiz"
            onPress={() => router.back()}
            hitSlop={12}
          >
            <Text style={styles.close}>close</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {isLoading ? null : isAuthenticated ? (
            <View style={styles.identity}>
              <Text style={[label, styles.kicker]}>account</Text>
              <Text style={styles.name}>{name ?? "player"}</Text>
              {identity?.isAnonymous ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push("/account")}
                  style={styles.anonymousNote}
                >
                  <Text style={styles.anonymousLink}>
                    anonymous session — add an email to keep this →
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sign in to keep your Elo on every device"
              onPress={() => router.push("/account")}
              style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
            >
              <Text style={styles.ctaLabel}>sign in →</Text>
              <Text style={styles.note}>
                Playing as a guest on this device. Sign in to keep your Elo, streak
                and done list everywhere.
              </Text>
            </Pressable>
          )}

          <Text style={[label, styles.kicker, styles.spaced]}>
            {tierFor(rating)}
            {isAuthenticated ? "" : " · on this device"}
          </Text>
          <Text style={styles.elo}>{rating}</Text>

          <View style={styles.grid}>
            <Stat value={answered} label="answered" />
            <Stat value={correct} label="correct" />
            <Stat
              value={answered === 0 ? "—" : `${Math.round(rate * 100)}%`}
              label="accuracy"
            />
            <Stat value={streak} label="streak" />
          </View>

          <View style={styles.block}>
            <Text style={[label, styles.kicker]}>done list</Text>
            <Text style={styles.blockValue}>{doneList.length}</Text>
            <Text style={styles.note}>
              Questions you have answered right. Missed ones come back around.
            </Text>
          </View>

          {misses.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: open }}
              accessibilityLabel={open ? "Hide unanswered questions" : "Show unanswered questions"}
              onPress={() => setOpen((v) => !v)}
              style={styles.disclosure}
            >
              <Text style={[label, styles.kicker]}>
                still to get {open ? "−" : "+"}
              </Text>
            </Pressable>
          ) : null}

          {open
            ? misses.map((m) => (
                <View key={`${m.id}-${m.at}`} style={styles.miss}>
                  <Text style={styles.missId}>{m.id}</Text>
                </View>
              ))
            : null}

          {isAuthenticated ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sign out"
              onPress={() => void signOut()}
              style={({ pressed }) => [styles.signOut, pressed && styles.ctaPressed]}
            >
              <Text style={styles.signOutLabel}>sign out</Text>
            </Pressable>
          ) : null}

          <Text style={styles.note}>
            {isAuthenticated
              ? "Signed in. Your Elo, streak and done list are on the server."
              : "Progress is stored on this device only. No account, no leaderboard."}
          </Text>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function Stat({ value, label: text }: { value: number | string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={[label, styles.statLabel]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ink },
  frame: { flex: 1, paddingHorizontal: GUTTER, paddingBottom: BOTTOM_INSET },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.inkLine,
  },
  title: { fontFamily: fonts.display, fontSize: 26, color: colors.paper },
  close: { ...label, color: colors.muted },
  body: { paddingTop: 24, paddingBottom: 32 },
  identity: { marginBottom: 4 },
  name: { fontFamily: fonts.display, fontSize: 26, color: colors.paper, marginTop: 6 },
  anonymousNote: { marginTop: 8, alignSelf: "flex-start", paddingVertical: 4 },
  anonymousLink: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 19, color: colors.signal },
  cta: { borderWidth: 1, borderColor: colors.signal, paddingHorizontal: 16, paddingVertical: 14 },
  ctaPressed: { backgroundColor: colors.signal },
  ctaLabel: { ...label, color: colors.signal },
  signOut: { marginTop: 40, alignSelf: "flex-start", borderWidth: 1, borderColor: colors.inkLine, paddingHorizontal: 18, paddingVertical: 11 },
  signOutLabel: { ...label, color: colors.muted },
  spaced: { marginTop: 34 },
  kicker: { color: colors.muted },
  elo: { fontFamily: fonts.display, fontSize: 64, color: colors.signal, marginTop: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap", marginTop: 24, gap: 12 },
  stat: { width: "47%", borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.inkLine, paddingTop: 10 },
  statValue: { fontFamily: fonts.mono, fontSize: 22, color: colors.paper },
  statLabel: { color: colors.muted, marginTop: 2 },
  block: { marginTop: 36 },
  blockValue: { fontFamily: fonts.mono, fontSize: 22, color: colors.paper, marginTop: 6 },
  disclosure: { marginTop: 32, paddingVertical: 6 },
  miss: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.inkLine, paddingVertical: 8 },
  missId: { fontFamily: fonts.mono, fontSize: 13, color: colors.muted },
  note: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 20, color: colors.muted, marginTop: 20 },
});
