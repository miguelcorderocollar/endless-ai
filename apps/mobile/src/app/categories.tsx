import { router } from "expo-router";
import { useQuery } from "convex/react";
import { useCallback, useState, useSyncExternalStore } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { counts } from "@/lib/api";
import { asCategoryKeys } from "@/lib/bank";
import { getFilter, subscribeProgress, updateFilter } from "@/lib/progress";
import { CATEGORIES, type CategoryKey } from "@shared/lib/questions/schema";
import { BOTTOM_INSET, colors, fonts, GUTTER, label } from "@/theme";

type Counts = { category: string; count: number };

/**
 * The fun-mode filter (#12), same shape as the web's `/categories`: tapping
 * categories narrows the draw, tapping again clears it, and "everything"
 * empties the set. It never touches Elo — only the draw reads it.
 */
export default function CategoriesScreen() {
  const filter = useSyncExternalStore(subscribeProgress, getFilter, getFilter);
  const countRows = useQuery(counts, {});
  const [busy, setBusy] = useState(false);

  const selected = new Set(asCategoryKeys(filter));

  const byCategory = new Map<string, number>();
  for (const row of countRows ?? []) {
    byCategory.set(row.category, row.count);
  }

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
          <Text style={styles.title}>Categories</Text>
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
          <Text style={[label, styles.kicker]}>
            {selected.size === 0 ? "all categories" : `${selected.size} selected`}
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: selected.size === 0 }}
            onPress={clear}
            style={({ pressed }) => [
              styles.row,
              selected.size === 0 && styles.rowActive,
              pressed && styles.rowPressed,
            ]}
          >
            <Text style={[styles.rowLabel, selected.size === 0 && styles.rowLabelActive]}>
              everything
            </Text>
          </Pressable>

          {countRows === undefined ? (
            <ActivityIndicator color={colors.signal} style={styles.spinner} />
          ) : (
            CATEGORIES.map((category) => {
              const active = selected.has(category.key);
              const count = byCategory.get(category.key) ?? 0;
              return (
                <Pressable
                  key={category.key}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: active }}
                  accessibilityLabel={`${category.label}, ${count} questions`}
                  disabled={count === 0}
                  onPress={() => toggle(category.key)}
                  style={({ pressed }) => [
                    styles.row,
                    active && styles.rowActive,
                    count === 0 && styles.rowEmpty,
                    pressed && count > 0 && styles.rowPressed,
                  ]}
                >
                  <Text style={[styles.rowLabel, active && styles.rowLabelActive]}>
                    {category.label}
                  </Text>
                  <Text style={[styles.count, active && styles.rowLabelActive]}>
                    {count === 0 ? "—" : count}
                  </Text>
                </Pressable>
              );
            })
          )}

          <Pressable
            accessibilityRole="button"
            onPress={done}
            disabled={busy}
            style={({ pressed }) => [styles.next, pressed && styles.nextPressed]}
          >
            <Text style={styles.nextLabel}>play</Text>
          </Pressable>
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
  body: { paddingTop: 20, paddingBottom: 32, gap: 8 },
  kicker: { color: colors.muted, marginBottom: 4 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colors.inkLine,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowActive: { borderColor: colors.signal, backgroundColor: colors.signal },
  rowPressed: { backgroundColor: "rgba(242,239,233,0.04)" },
  rowEmpty: { opacity: 0.4 },
  rowLabel: { fontFamily: fonts.sans, fontSize: 15, color: colors.paper },
  rowLabelActive: { color: colors.ink },
  count: { ...label, color: colors.muted },
  spinner: { marginTop: 24 },
  next: {
    marginTop: 28,
    alignSelf: "flex-start",
    backgroundColor: colors.signal,
    borderWidth: 1,
    borderColor: colors.signal,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  nextPressed: { backgroundColor: colors.paper, borderColor: colors.paper },
  nextLabel: { ...label, color: colors.ink },
});
