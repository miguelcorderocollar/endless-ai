import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useConvexAuth } from "convex/react";
import { answer as answerRef, draw as drawRef } from "@/lib/api";
import { currentHandle } from "@/lib/account";
import { Masthead } from "@/components/Masthead";
import { Rise, staggerDelay, usePrefersReducedMotion } from "@/components/rise";
import { asCategoryKeys, toQuestions } from "@/lib/bank";
import { convexClient } from "@/lib/backend";
import { drawLocal } from "@/lib/localBank";
import {
  drainOutbox,
  enqueueAnswer,
  newEventId,
  shouldReconcile,
} from "@/lib/outbox";
import {
  EMPTY_PROGRESS,
  getFilter,
  getProgress,
  hasHydrated,
  hydrateProgress,
  subscribeProgress,
  updateProgress,
} from "@/lib/progress";
import { pickNext } from "@shared/lib/quiz/engine";
import { scoreAnswer } from "@shared/lib/quiz/elo";
import {
  type CategoryKey,
  type Question,
  sourceHref,
  sourceLabel,
} from "@shared/lib/questions/schema";
import { RECENT_CAP } from "@shared/lib/progress";
import { BOTTOM_INSET, colors, fonts, GUTTER, label } from "@/theme";

type Phase = "question" | "revealed";

/** Questions per server draw (#25). Matches the web's page size. */
const PAGE = 20;

/** Top up once the buffer drops below this, so `next` rarely waits on a query. */
const REORDER_AT = 5;

const LETTERS = ["A", "B", "C", "D"] as const;

export default function QuizScreen() {
  const reduceMotion = usePrefersReducedMotion();

  const progress = useSyncExternalStore(
    subscribeProgress,
    hasHydrated() ? getProgress : () => EMPTY_PROGRESS,
    () => EMPTY_PROGRESS,
  );
  const filter = useSyncExternalStore(subscribeProgress, getFilter, getFilter);

  // The queue lives in a ref because `advance` reads it after an await, where
  // a state closure would be stale. `queueLen` mirrors it purely to re-render.
  const queueRef = useRef<Question[]>([]);
  const seenRef = useRef<Set<string>>(new Set());
  const [queueLen, setQueueLen] = useState(0);

  const [current, setCurrent] = useState<Question | null>(null);
  const [phase, setPhase] = useState<Phase>("question");
  const [picked, setPicked] = useState<string | null>(null);
  const [exhausted, setExhausted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const client = convexClient();
  const { isAuthenticated } = useConvexAuth();

  const filterKey = filter.join(",");
  const categories = useMemo(
    () => new Set<CategoryKey>(asCategoryKeys(filter)),
    [filter],
  );

  const setQueue = useCallback((next: Question[]) => {
    queueRef.current = next;
    setQueueLen(next.length);
  }, []);

  useEffect(() => {
    void hydrateProgress();
  }, []);

  /**
   * One draw, from wherever it can be had. Convex first, the bundled bank
   * second.
   *
   * The fallback is not a degraded mode that has to be labelled: it is the same
   * filter, the same Elo-matched weighting (`weightedSample`, the function the
   * server's own draw calls) and the same schema-validated rows, so the only
   * difference is whether the question came over the wire. Before the bank was
   * bundled, a cold offline launch had nothing to show at all — which is the
   * one case offline play exists for.
   */
  const drawPage = useCallback(
    async (opts: { seen: Set<string>; filter: string[]; rating: number }) => {
      const keys = new Set<CategoryKey>(asCategoryKeys(opts.filter));
      const local = () =>
        drawLocal({
          seen: opts.seen,
          categories: keys,
          ratingHint: opts.rating,
          count: PAGE,
        });
      if (!client) return local();
      try {
        // `excludeIds` is the server's no-repeat list; it keeps only the last
        // 1000, so an ancient answer can resurface on a very long run. Same
        // misses-come-back behaviour as the web draw.
        const rows = await client.query(drawRef, {
          excludeIds: [...opts.seen].slice(-1000),
          count: PAGE,
          categories: opts.filter.length > 0 ? opts.filter : undefined,
          ratingHint: opts.rating,
        });
        return toQuestions(rows);
      } catch {
        // Unreachable is not the end of the quiz: the whole bank is in the
        // binary, and the fallback draws from it with the same rules.
        return local();
      }
    },
    [client],
  );

  const show = useCallback(
    (question: Question) => {
      seenRef.current.add(question.id);
      setCurrent(question);
      setPicked(null);
      setPhase("question");
      setQueue(queueRef.current.filter((q) => q.id !== question.id));
    },
    [setQueue],
  );

  // Filter change restarts the stream: the drawn page was picked for the old
  // categories, and the web app keys its session the same way (#12).
  useEffect(() => {
    seenRef.current = new Set();
    setQueue([]);
    setCurrent(null);
    setExhausted(false);
    setLoading(true);
  }, [filterKey, setQueue]);

  // Draw for the first question, and top up in the background whenever the
  // buffer runs low. `drawn` guards against overlapping queries: `drawPage` is
  // an await, and two in flight on the same seen set would return the same page.
  const drawn = useRef(false);
  useEffect(() => {
    if (drawn.current) return;
    drawn.current = true;
    void (async () => {
      try {
        const fresh = await drawPage({
          seen: seenRef.current,
          filter,
          rating: progress.rating,
        });
        setQueue(fresh);
        const first = pickNext(
          fresh,
          seenRef.current,
          categories,
          Math.random,
          progress.rating,
        );
        if (first) show(first);
        else setExhausted(true);
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Could not reach the quiz server",
        );
      } finally {
        drawn.current = false;
        setLoading(false);
      }
    })();
    // Deliberately first-draw only; the low-buffer effect below owns refills.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey, drawPage]);

  useEffect(() => {
    if (exhausted || error || queueLen >= REORDER_AT) return;
    let cancelled = false;
    void (async () => {
      try {
        const fresh = await drawPage({
          seen: seenRef.current,
          filter,
          rating: progress.rating,
        });
        if (cancelled) return;
        setQueue([
          ...queueRef.current,
          ...fresh.filter((q) => !seenRef.current.has(q.id)),
        ]);
      } catch {
        // A failed top-up is not fatal: the buffer is still playable, and the
        // next reveal will try again. Only a failure to draw *anything* ends
        // the run, which is what `exhausted` is for.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [queueLen, exhausted, error, drawPage, filter, progress.rating, setQueue]);

  const answer = useCallback(
    (option: string) => {
      if (phase !== "question" || !current) return;
      const correct = option === current.answer;
      const { rating } = scoreAnswer(
        progress.rating,
        current.difficulty,
        correct,
      );

      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
        /* haptics are a nicety, and a device without a vibrator rejects */
      });

      setPicked(option);
      setPhase("revealed");

      updateProgress({
        ...progress,
        rating,
        answered: progress.answered + 1,
        correct: progress.correct + (correct ? 1 : 0),
        // No local streak: the server owns it, and the web leaves it alone for
        // the same reason. A guest's streak reads whatever the last reconcile
        // left behind, on both apps — scoring it locally here made two phones
        // disagree about a number only the server can compute.
        completed:
          correct && !progress.completed.includes(current.id)
            ? [...progress.completed, current.id]
            : progress.completed,
        recent: [
          ...progress.recent,
          { id: current.id, correct, at: Date.now() },
        ].slice(-RECENT_CAP),
        lastPlayed: new Date().toISOString().slice(0, 10),
      });

      // Signed in: the server is truth for Elo and owns the event log (#3/#4).
      // The local update above already happened so feedback is instant.
      //
      // Every signed-in answer goes through the outbox, including the live ones:
      // a mutation that fails is indistinguishable from one whose response was
      // lost, and only the outbox's exact `eventId` dedupe tells them apart on
      // replay. Enqueue-then-drain, so a dead connection parks the event instead
      // of dropping it, and the same queue is what `OutboxFlusher` retries when
      // the network comes back. A guest stays local-only, which is what #2 wants.
      if (isAuthenticated && client) {
        const account = currentHandle();
        enqueueAnswer({
          eventId: newEventId(),
          questionId: current.id,
          picked: option,
          account,
          at: Date.now(),
        });
        void drainOutbox(
          (args) => client.mutation(answerRef, args),
          account,
        ).then(({ sent, lastRating, maxAt }) => {
          if (sent > 0 && lastRating !== null && shouldReconcile(account, maxAt)) {
            updateProgress({ ...getProgress(), rating: lastRating });
          }
        });
      }
    },
    [client, current, isAuthenticated, phase, progress],
  );

  const advance = useCallback(async () => {
    if (phase !== "revealed") return;

    const fromBuffer = pickNext(
      queueRef.current,
      seenRef.current,
      categories,
      Math.random,
      progress.rating,
    );
    if (fromBuffer) {
      show(fromBuffer);
      return;
    }

    setLoading(true);
    try {
      const fresh = await drawPage({
        seen: seenRef.current,
        filter,
        rating: progress.rating,
      });
      const combined = [...queueRef.current, ...fresh];
      const next = pickNext(
        combined,
        seenRef.current,
        categories,
        Math.random,
        progress.rating,
      );
      if (!next) {
        setQueue([]);
        setExhausted(true);
        return;
      }
      // Keep the page remainder, not just the pick: dropping it costs a full
      // redraw at the next buffer exhaustion for questions already on hand.
      // `show` filters the stale mirror, so the leftovers go in after it.
      show(next);
      setQueue(combined.filter((q) => q.id !== next.id));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not reach the quiz server",
      );
    } finally {
      setLoading(false);
    }
  }, [categories, drawPage, filter, phase, progress.rating, show]);

  const href = current ? sourceHref(current.source) : null;
  const sourceText = current ? sourceLabel(current.source) : null;
  const motion = !reduceMotion;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.frame}>
        <Masthead rating={progress.rating} />

        {error ? (
          <ErrorPanel message={error} onRetry={() => router.replace("/")} />
        ) : exhausted && !current ? (
          <Exhausted />
        ) : !current ? (
          <Loading />
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.body}
            showsVerticalScrollIndicator={false}
          >
            <Rise enabled={motion}>
              <Text style={styles.question}>{current.text}</Text>
            </Rise>

            <View style={styles.options}>
              {current.options.map((option, index) => (
                <Rise key={option} delay={staggerDelay(index)} enabled={motion}>
                  <Option
                    letter={LETTERS[index]!}
                    label={option}
                    picked={picked === option}
                    answer={option === current.answer}
                    revealed={phase === "revealed"}
                    disabled={phase === "revealed"}
                    onPress={() => answer(option)}
                  />
                </Rise>
              ))}
            </View>

            {phase === "revealed" ? (
              <Reveal
                key={`reveal-${current.id}`}
                motion={motion}
                correct={picked === current.answer}
                explanation={current.explanation}
                href={href}
                sourceText={sourceText}
                busy={loading}
                onNext={() => void advance()}
              />
            ) : null}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

function Option({
  letter,
  label,
  picked,
  answer,
  revealed,
  disabled,
  onPress,
}: {
  letter: string;
  label: string;
  picked: boolean;
  answer: boolean;
  revealed: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  // Same four tones as the web: idle is an outlined row in paper, the right
  // answer fills signal, a wrong pick fills fail, and everything else drops to
  // muted once revealed. Text flips to ink on the two filled states, which is
  // why the colour is picked per tone rather than set once on the container.
  let tone: ViewStyle = styles.optionIdle;
  let ink: TextStyle = styles.onInk;
  if (revealed && answer) {
    tone = styles.optionAnswer;
    ink = styles.onFill;
  } else if (revealed && picked) {
    tone = styles.optionWrong;
    ink = styles.onFill;
  } else if (revealed) {
    tone = styles.optionDim;
    ink = styles.onMuted;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${letter}. ${label}`}
      accessibilityState={{ disabled, selected: picked }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        tone,
        pressed && !revealed && styles.optionPressed,
      ]}
    >
      <Text style={[styles.optionLetter, ink]}>{letter}</Text>
      <Text style={[styles.optionLabel, ink]}>{label}</Text>
    </Pressable>
  );
}

function Reveal({
  motion,
  correct,
  explanation,
  href,
  sourceText,
  busy,
  onNext,
}: {
  motion: boolean;
  correct: boolean;
  explanation: string;
  href: string | null;
  sourceText: string | null;
  busy: boolean;
  onNext: () => void;
}) {
  return (
    <Rise enabled={motion}>
      <View style={styles.reveal}>
        <Text
          style={[
            label,
            styles.verdict,
            correct ? styles.verdictRight : styles.verdictWrong,
          ]}
        >
          {correct ? "correct" : "not quite"}
        </Text>
        <Text style={styles.explanation}>{explanation}</Text>

        <View style={styles.revealActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Next question"
            onPress={onNext}
            disabled={busy}
            style={({ pressed }) => [
              styles.next,
              pressed && styles.nextPressed,
            ]}
          >
            <Text style={styles.nextLabel}>next</Text>
          </Pressable>

          {href && sourceText ? (
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={`Learn more about ${sourceText}`}
              onPress={() => void WebBrowser.openBrowserAsync(href)}
              style={({ pressed }) => [
                styles.learn,
                pressed && styles.learnPressed,
              ]}
            >
              <Text style={styles.learnLabel}>learn →</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Rise>
  );
}

function Loading() {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.signal} />
    </View>
  );
}

function Exhausted() {
  return (
    <View style={styles.body}>
      <Text style={[label, styles.kicker]}>bank complete</Text>
      <Text style={styles.title}>Every question, answered right</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push("/profile")}
        style={({ pressed }) => [
          styles.next,
          styles.exhaustedAction,
          pressed && styles.nextPressed,
        ]}
      >
        <Text style={styles.nextLabel}>see your done list</Text>
      </Pressable>
    </View>
  );
}

function ErrorPanel({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <View style={styles.body}>
      <Text style={[label, styles.kicker]}>offline</Text>
      <Text style={styles.title}>Can't reach the quiz</Text>
      <Text style={styles.copy}>{message}</Text>
      <Text style={styles.copy}>
        Answers you give offline are queued and sent when you are back, so
        nothing is lost — the bank ships inside the app, so the quiz keeps going
        too.
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={onRetry}
        style={({ pressed }) => [
          styles.next,
          styles.exhaustedAction,
          pressed && styles.nextPressed,
        ]}
      >
        <Text style={styles.nextLabel}>try again</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ink },
  frame: { flex: 1, paddingHorizontal: GUTTER, paddingBottom: BOTTOM_INSET },
  scroll: { flex: 1 },
  body: { flexGrow: 1, paddingTop: 12, paddingBottom: 32 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  question: {
    fontFamily: fonts.display,
    fontSize: 30,
    lineHeight: 37,
    color: colors.paper,
    marginTop: 12,
  },

  options: { marginTop: 32, gap: 8 },
  option: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  optionPressed: {
    backgroundColor: "rgba(242,239,233,0.04)",
    borderColor: "rgba(242,239,233,0.5)",
  },
  optionIdle: { borderColor: colors.inkLine },
  optionAnswer: { borderColor: colors.signal, backgroundColor: colors.signal },
  optionWrong: { borderColor: colors.fail, backgroundColor: colors.fail },
  optionDim: { borderColor: colors.inkLine },
  optionLetter: {
    ...label,
    width: 16,
    marginTop: 2,
    opacity: 0.6,
  },
  optionLabel: {
    fontFamily: fonts.sans,
    fontSize: 15,
    lineHeight: 21,
    flex: 1,
  },
  onInk: { color: colors.paper },
  onFill: { color: colors.ink },
  onMuted: { color: colors.muted },

  reveal: {
    marginTop: 28,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.inkLine,
    paddingTop: 20,
  },
  verdict: { color: colors.signal },
  verdictRight: { color: colors.signal },
  verdictWrong: { color: colors.fail },
  explanation: {
    fontFamily: fonts.sans,
    fontSize: 15,
    lineHeight: 24,
    color: "rgba(242,239,233,0.85)",
    marginTop: 12,
  },
  revealActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    marginTop: 20,
  },
  next: {
    backgroundColor: colors.signal,
    borderWidth: 1,
    borderColor: colors.signal,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  nextPressed: { backgroundColor: colors.paper, borderColor: colors.paper },
  nextLabel: { ...label, color: colors.ink },
  learn: { paddingVertical: 10 },
  learnPressed: { opacity: 0.6 },
  learnLabel: { ...label, color: colors.muted },

  kicker: { color: colors.muted },
  title: {
    fontFamily: fonts.display,
    fontSize: 30,
    color: colors.paper,
    marginTop: 12,
  },
  copy: {
    fontFamily: fonts.sans,
    fontSize: 15,
    lineHeight: 23,
    color: colors.muted,
    marginTop: 16,
  },
  exhaustedAction: { alignSelf: "flex-start", marginTop: 32 },
});
