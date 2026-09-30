import { router } from "expo-router";
import { useQuery } from "convex/react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { counts as countsRef, myStats as myStatsRef } from "@/lib/api";
import { useConvexAuth } from "convex/react";
import { asCategoryKeys } from "@/lib/bank";
import { getFilter, subscribeProgress, updateFilter } from "@/lib/progress";
import {
  readCountsCache,
  subscribeCaches,
  writeCountsCache,
} from "@/lib/profileCache";
import { accuracyByCategory } from "@shared/lib/quiz/categoryAccuracy";
import { CATEGORIES, type CategoryKey } from "@shared/lib/questions/schema";
import { BOTTOM_INSET, colors, fonts, GUTTER, label } from "@/theme";

/**
 * The fun-mode filter (#12), and the web's `/categories` page: the same list, the
 * same bracket counts, and the same per-category accuracy bars. Tapping a
 * category narrows the draw, tapping again clears it, and "everything" empties
 * the set. It never touches Elo — only the draw reads it.
 *
 * A dash is not a zero. A category you have never answered has no bar and no
 * percentage, and the arithmetic behind that distinction is shared with the web
 * (`accuracyByCategory`) so the two cannot disagree about it.
 */
export default function CategoriesScreen() {
  const filter = useSyncExternalStore(subscribeProgress, getFilter, getFilter);
  const cachedCounts = useSyncExternalStore(
    subscribeCaches,
    readCountsCache,
    readCountsCache,
  );
  const { isAuthenticated } = useConvexAuth();
  const countRows = useQuery(countsRef, {});
  const stats = useQuery(myStatsRef, isAuthenticated ? {} : "skip");
  const [busy, setBusy] = useState(false);

  const selected = useMemo(() => new Set(asCategoryKeys(filter)), [filter]);

  const rows = countRows ?? cachedCounts;

  // Write-through, in an effect and never during render. `writeCountsCache`
  // notifies the `useSyncExternalStore` that owns the mirror, so calling it
  // while rendering is a render loop for the same reason the profile's is — see
  // the note there.
  useEffect(() => {
    if (countRows) writeCountsCache(countRows);
  }, [countRows]);

  const countByCategory = useMemo(() => {
    const byCategory = new Map<string, number>();
    for (const row of rows ?? []) byCategory.set(row.category, row.count);
    return byCategory;
  }, [rows]);

  const byCategory = accuracyByCategory(stats?.byCategory);

  const toggle = useCallback(
    (key: CategoryKey) => {
      const next = selected.has(key)
        ? filter.filter((k) => k !== key)
        : [...filter, key];
      updateFilter(next);
    },
    [filter, selected],
  );

  const clear = useCallback(() => updateFilter([]), []);

  const done = useCallback(() => {
    // The quiz keys its drawn stream on the filter, so returning to it has to
    // reset that screen rather than pop back onto a stale question.
    setBusy(true);
    router.dismissTo("/");
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.frame}>
        <View style={styles.bar}>
          <Text style={styles.title}>
            {selected.size === 0 ? "Everything" : `${selected.size} selected`}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to the quiz"
            onPress={() => router.back()}
            hitSlop={12}
          >
            <Text style={styles.close}>close</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[label, styles.kicker]}>choose a category</Text>
          <Text style={styles.copy}>
            For fun only — filtering never touches your Elo or ranking. The bar
            is your accuracy; the bracketed number is how many questions are in
            that category. A dash means you have not answered it yet.
          </Text>

          <View style={styles.list}>
            {CATEGORIES.map((category) => {
              const active = selected.has(category.key);
              const count = countByCategory.get(category.key);
              const pct = byCategory.get(category.key)?.pct ?? null;
              const empty = count === 0;
              return (
                <Pressable
                  key={category.key}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: active, disabled: empty }}
                  accessibilityLabel={`${category.label}, ${count ?? "…"} questions${
                    pct === null ? "" : `, ${pct}% correct`
                  }`}
                  disabled={empty}
                  onPress={() => toggle(category.key)}
                  style={({ pressed }) => [
                    styles.row,
                    active && styles.rowActive,
                    empty && styles.rowEmpty,
                    pressed && !active && !empty && styles.rowPressed,
                  ]}
                >
                  <View style={styles.rowHead}>
                    <Text style={[styles.rowLabel, active && styles.onFill]}>
                      {category.label}
                    </Text>
                    <Text
                      style={[
                        label,
                        active ? styles.countActive : styles.count,
                      ]}
                    >
                      [{count ?? "…"}]
                    </Text>
                  </View>
                  <View style={[styles.track, active && styles.trackActive]}>
                    <View
                      style={[
                        styles.fill,
                        active
                          ? styles.fillActive
                          : pct !== null && pct >= 50
                            ? styles.fillGood
                            : styles.fillBad,
                        { width: `${pct ?? 0}%` },
                      ]}
                    />
                  </View>
                  <Text
                    style={[
                      label,
                      styles.pct,
                      active
                        ? styles.onFill
                        : pct !== null
                          ? styles.pctKnown
                          : styles.pctUnknown,
                    ]}
                  >
                    {pct !== null ? `${pct}%` : "—"}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                selected.size === 0 ? "Play everything" : "Play selected"
              }
              onPress={done}
              disabled={busy}
              style={({ pressed }) => [
                styles.primary,
                pressed && styles.primaryPressed,
              ]}
            >
              <Text style={styles.primaryLabel}>
                {selected.size === 0 ? "play everything" : "play selected"}
              </Text>
            </Pressable>
            {selected.size > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear selection"
                onPress={clear}
                hitSlop={8}
              >
                <Text style={[label, styles.clear]}>clear</Text>
              </Pressable>
            ) : null}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
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
  copy: {
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 22,
    color: colors.muted,
    marginTop: 16,
    maxWidth: 460,
  },
  list: { marginTop: 24, gap: 8 },
  row: {
    borderWidth: 1,
    borderColor: colors.inkLine,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowActive: { borderColor: colors.signal, backgroundColor: colors.signal },
  rowPressed: {
    borderColor: "rgba(242,239,233,0.5)",
    backgroundColor: "rgba(242,239,233,0.04)",
  },
  rowEmpty: { opacity: 0.4 },
  rowHead: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  rowLabel: {
    fontFamily: fonts.sans,
    fontSize: 15,
    lineHeight: 20,
    color: colors.paper,
    flexShrink: 1,
  },
  count: { color: "rgba(111,117,128,0.6)", marginLeft: 8 },
  countActive: { color: "rgba(10,11,13,0.6)" },
  // `h-1` on the web, between the label row and the percentage.
  track: { height: 1, backgroundColor: colors.inkLine, marginTop: 10 },
  trackActive: { backgroundColor: "rgba(10,11,13,0.2)" },
  fill: { height: 1 },
  fillActive: { backgroundColor: colors.ink },
  fillGood: { backgroundColor: colors.signal },
  fillBad: { backgroundColor: colors.fail },
  pct: { textAlign: "right", marginTop: 8 },
  pctKnown: { color: colors.paper },
  pctUnknown: { color: "rgba(111,117,128,0.4)" },
  onFill: { color: colors.ink },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginTop: 32,
  },
  primary: {
    alignSelf: "flex-start",
    backgroundColor: colors.signal,
    borderWidth: 1,
    borderColor: colors.signal,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  primaryPressed: { backgroundColor: colors.paper, borderColor: colors.paper },
  primaryLabel: { ...label, color: colors.ink },
  clear: { color: colors.muted },
});
