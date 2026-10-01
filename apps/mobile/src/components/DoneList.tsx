import * as WebBrowser from "expo-web-browser";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { buildDoneList, resolveDoneList } from "@shared/lib/answers/doneList";
import {
  sourceHref,
  sourceLabel,
  type Question,
} from "@shared/lib/questions/schema";
import { colors, fonts, label } from "@/theme";

/**
 * The web's `DoneList.tsx` (`src/components/DoneList.tsx`), screen for screen.
 * The same headline — big `correct`, small `/answered`, the "answered correctly ·
 * N in the training set" line — then one list of what you did, newest first,
 * misses in red among the finished ones, each with a Learn link.
 *
 * One list and the fifty-question cap are `buildDoneList`'s, shared with the web
 * rather than restated here.
 */
export function DoneList({
  bank,
  completedIds,
  attempts,
  correct,
  answered,
  total,
}: {
  bank: Question[];
  completedIds: string[];
  /** Recent attempts in record order, oldest first. */
  attempts: { id: string; correct: boolean }[];
  /** Correct count (server truth when signed in, device count otherwise). */
  correct: number;
  /** Answered count, same source as correct. */
  answered: number;
  /** Published bank size. */
  total: number;
}) {
  const rows = useMemo(
    () => resolveDoneList(buildDoneList({ completedIds, attempts }), bank),
    [bank, completedIds, attempts],
  );

  return (
    <View>
      <Text style={styles.headline}>
        {correct}
        <Text style={styles.headlineTotal}>/{answered}</Text>
      </Text>
      <Text style={[label, styles.subhead]}>
        answered correctly · {total} in the training set
      </Text>

      {rows.length === 0 ? (
        <Text style={styles.blank}>
          Nothing here yet. Answer a question right and it lands on this list —
          get one wrong and it shows up in red until you get it right.
        </Text>
      ) : (
        <>
          {/* Just the heading. The old line carried a count, a "to retry"
              count and a "newest 50" note, which is three numbers about a list
              a player can see. The list itself is the information. */}
          <Text style={[label, styles.kicker]}>latest answers</Text>
          {rows.map((row) => (
            <Row key={row.id} q={row.question} correct={row.correct} />
          ))}
        </>
      )}
    </View>
  );
}

function Row({ q, correct }: { q: Question; correct: boolean }) {
  const href = sourceHref(q.source);
  const sourceText = sourceLabel(q.source);
  return (
    <View
      style={[
        styles.row,
        { borderTopColor: correct ? colors.inkLine : "rgba(255,90,54,0.4)" },
      ]}
    >
      <Text style={styles.rowText}>{q.text}</Text>
      <Text style={[label, correct ? styles.doneText : styles.missText]}>
        {q.answer}
      </Text>
      {href && sourceText ? (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`Learn about ${sourceText}`}
          onPress={() => void WebBrowser.openBrowserAsync(href)}
          style={({ pressed }) => [styles.learn, pressed && styles.pressed]}
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
  kicker: { color: colors.muted, marginTop: 40, marginBottom: 20 },
  row: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 16,
    marginBottom: 20,
  },
  rowText: {
    fontFamily: fonts.sans,
    fontSize: 15,
    lineHeight: 20,
    color: "rgba(242,239,233,0.9)",
  },
  missText: { color: colors.fail, marginTop: 8 },
  doneText: { color: colors.signal, marginTop: 8 },
  learn: { alignSelf: "flex-start", paddingVertical: 8, marginTop: 4 },
  pressed: { opacity: 0.6 },
  learnLabel: { color: colors.muted },
});
