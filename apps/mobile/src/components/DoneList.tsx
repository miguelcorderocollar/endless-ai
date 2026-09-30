import * as WebBrowser from "expo-web-browser";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  sourceHref,
  sourceLabel,
  type Question,
} from "@shared/lib/questions/schema";
import { colors, fonts, label } from "@/theme";

/** Initial page; "show more" adds another page. Keeps long lists cheap. */
const PAGE_SIZE = 25;

/**
 * The web's `DoneList.tsx` (`src/components/DoneList.tsx`), screen for screen.
 * The same headline — big `correct`, small `/answered`, the
 * "answered correctly · N in the training set" line — then misses in red above
 * a browsable list of everything answered right, each with a Learn link.
 *
 * The page-through is the point of the port. The native profile used to show a
 * count and a disclosure of ids, which is not a done list; this is the list.
 */
export function DoneList({
  bank,
  completedIds,
  missedIds,
  correct,
  answered,
  total,
}: {
  bank: Question[];
  completedIds: string[];
  /** Most-recently-wrong ids (a later correct clears the miss). */
  missedIds: string[];
  /** Correct count (server truth when signed in, device count otherwise). */
  correct: number;
  /** Answered count, same source as correct. */
  answered: number;
  /** Published bank size. */
  total: number;
}) {
  const [visible, setVisible] = useState(PAGE_SIZE);

  const { done, missed } = useMemo(() => {
    const byId = new Map(bank.map((q) => [q.id, q]));
    const resolve = (ids: string[]) =>
      ids.flatMap((id) => {
        const q = byId.get(id);
        return q ? [q] : [];
      });
    return { done: resolve(completedIds), missed: resolve(missedIds) };
  }, [bank, completedIds, missedIds]);

  const shown = done.slice(0, visible);
  const remaining = done.length - shown.length;

  return (
    <View>
      <Text style={styles.headline}>
        {correct}
        <Text style={styles.headlineTotal}>/{answered}</Text>
      </Text>
      <Text style={[label, styles.subhead]}>
        answered correctly · {total} in the training set
      </Text>

      {done.length === 0 && missed.length === 0 ? (
        <Text style={styles.blank}>
          Nothing here yet. Answer a question right and it lands on this list —
          get one wrong and it shows up below in red until you get it right.
        </Text>
      ) : null}

      {missed.length > 0 ? (
        <View style={styles.section}>
          <Text style={[label, styles.missedKicker]}>
            missed · {missed.length} to retry
          </Text>
          {missed.map((q) => (
            <Row
              key={q.id}
              q={q}
              tone={styles.missText}
              rule={styles.missRule}
            />
          ))}
        </View>
      ) : null}

      {done.length > 0 ? (
        <View style={styles.section}>
          <Text style={[label, styles.doneKicker]}>done · {done.length}</Text>
          {shown.map((q) => (
            <Row
              key={q.id}
              q={q}
              tone={styles.doneText}
              rule={styles.doneRule}
            />
          ))}
          {remaining > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Show ${Math.min(remaining, PAGE_SIZE)} more done questions`}
              onPress={() => setVisible((v) => v + PAGE_SIZE)}
              style={({ pressed }) => [
                styles.more,
                pressed && styles.morePressed,
              ]}
            >
              <Text style={[label, styles.moreLabel]}>
                show {Math.min(remaining, PAGE_SIZE)} more · {remaining} left
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function Row({ q, tone, rule }: { q: Question; tone: object; rule: object }) {
  const href = sourceHref(q.source);
  const sourceText = sourceLabel(q.source);
  return (
    <View style={[styles.row, rule]}>
      <Text style={styles.rowText}>{q.text}</Text>
      <Text style={[label, tone]}>{q.answer}</Text>
      {href && sourceText ? (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`Learn about ${sourceText}`}
          onPress={() => void WebBrowser.openBrowserAsync(href)}
          style={({ pressed }) => [
            styles.learn,
            pressed && styles.learnPressed,
          ]}
        >
          <Text style={[label, styles.learnLabel]}>learn →</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  headline: {
    fontFamily: fonts.display,
    fontSize: 64,
    lineHeight: 72,
    marginTop: 8,
    color: colors.paper,
  },
  headlineTotal: { fontSize: 30, color: colors.muted },
  subhead: { color: colors.muted, marginTop: 16 },
  blank: {
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 22,
    color: colors.muted,
    marginTop: 40,
    maxWidth: 380,
  },
  section: { marginTop: 40, gap: 20 },
  missedKicker: { color: colors.fail, marginBottom: 4 },
  doneKicker: { color: colors.muted, marginBottom: 4 },
  row: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 16 },
  rowText: {
    fontFamily: fonts.sans,
    fontSize: 15,
    lineHeight: 20,
    color: "rgba(242,239,233,0.9)",
  },
  missRule: { borderTopColor: "rgba(255,90,54,0.4)" },
  missText: { color: colors.fail, marginTop: 8 },
  doneRule: { borderTopColor: colors.inkLine },
  doneText: { color: colors.signal, marginTop: 8 },
  learn: { alignSelf: "flex-start", paddingVertical: 8, marginTop: 4 },
  learnPressed: { opacity: 0.6 },
  learnLabel: { color: colors.muted },
  more: { alignSelf: "flex-start", paddingVertical: 10, marginTop: 4 },
  morePressed: { opacity: 0.6 },
  moreLabel: { color: colors.muted },
});
