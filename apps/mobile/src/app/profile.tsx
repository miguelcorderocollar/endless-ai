import { router } from "expo-router";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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
 * Local progress only. The web says the same thing in `src/lib/progress.ts`:
 * prototype progress is local until accounts exist, and this screen must not
 * imply a synced account, a rank, or a shared result.
 */
export default function ProfileScreen() {
  const progress = useSyncExternalStore(
    subscribeProgress,
    hasHydrated() ? getProgress : () => EMPTY_PROGRESS,
    () => EMPTY_PROGRESS,
  );
  const [open, setOpen] = useState(false);

  useEffect(() => {
    void hydrateProgress();
  }, []);

  // Lifetime accuracy, not a run: `accuracy()` in the shared engine takes
  // per-run AnswerRecords, and the recent ring buffer only keeps ids and
  // verdicts. Lifetime totals are what progress already holds.
  const rate = progress.answered === 0 ? 0 : progress.correct / progress.answered;

  // The ring buffer stores ids, not categories, so this screen reports the
  // misses it can actually name and leaves per-category bars to the offline
  // pass, which is where the answer events start carrying categories.
  const misses = progress.recent.filter((r) => !r.correct).slice(-10).reverse();

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
          <Text style={[label, styles.kicker]}>{tierFor(progress.rating)}</Text>
          <Text style={styles.elo}>{progress.rating}</Text>

          <View style={styles.grid}>
            <Stat value={progress.answered} label="answered" />
            <Stat value={progress.correct} label="correct" />
            <Stat
              value={progress.answered === 0 ? "—" : `${Math.round(rate * 100)}%`}
              label="accuracy"
            />
            <Stat value={progress.streak} label="streak" />
          </View>

          <View style={styles.block}>
            <Text style={[label, styles.kicker]}>done list</Text>
            <Text style={styles.blockValue}>{progress.completed.length}</Text>
            <Text style={styles.note}>
              Questions you have answered right. Missed ones come back around.
            </Text>
          </View>

          {misses.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: open }}
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

          <Text style={styles.note}>
            Progress is stored on this device only. No account, no leaderboard.
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
