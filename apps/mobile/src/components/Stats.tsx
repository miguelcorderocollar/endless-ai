import { StyleSheet, Text, View } from "react-native";
import Svg, { G, Line, Polyline, Text as SvgText } from "react-native-svg";

import { colors, fonts, label } from "@/theme";

/**
 * The Elo-over-time chart (`src/components/Stats.tsx` on the web), redrawn in
 * `react-native-svg` rather than a chart library.
 *
 * The geometry is deliberately the same arithmetic as the web's: same four
 * gridlines at 15/40/65/90% of the value span, same signal-coloured median line,
 * same `Math.max(hi - lo, 40)` floor so a flat rating does not get a wildly
 * magnified axis. Two views of the same data that disagree by a few pixels would
 * read as a bug in the app, which is the thing this whole pass exists to
 * prevent.
 *
 * It is drawn **1:1** — the viewBox is the panel in dp — and that is the third
 * attempt at the sizing, so it is worth saying why the other two were wrong.
 *
 * The web stretches: a 560x220 viewBox in a 672x240 box with
 * `preserveAspectRatio="none"`, which is 1.20x horizontally against 1.09x
 * vertically. Mild. Copying that stretch onto a 372x300dp panel is 0.66x against
 * 1.36x — a factor of two — so the gridline labels came out visibly squashed and
 * elongated. Equal heights, wrong-looking numbers: the worst of both.
 *
 * Keeping the aspect ratio instead fixed the distortion and left the chart at
 * 146dp in a 300dp panel, which is where the dead space came back from.
 *
 * So neither: the viewBox *is* the measured panel, everything inside is computed
 * as a fraction of it, and the default uniform scale makes it fill the box with
 * nothing scaled at all. Labels render at the 11 they ask for. The chart's shape
 * changes with the panel rather than being stretched into it, which is what
 * adapting to the space is supposed to mean.
 */

/**
 * The fixed height of the panel the two tabs share, and the rule that keeps them
 * the same size.
 *
 * The web's mechanism is `min-h-[340px]` around each tab, so switching tabs
 * never moves the done list. Copying that literally did not work here: the chart
 * computed its height in raw pixels while the histogram hard-coded dp, so on a
 * 420dpi phone the distribution came out about three times taller, and the
 * panel then grew to fit it.
 *
 * So the panel is a fixed height and both visuals *fill* it — the chart's SVG is
 * the full panel, and the histogram takes whatever the axis and caption leave
 * over. That is the opposite of the web's `h-60`-in-`min-h-[340px]`, and
 * deliberately: on a 672px column the web's 100px of slack under the chart is
 * barely noticeable, while on a 372dp phone it was roughly 180dp of dead space
 * under the chart and none at all under the histogram. Equal boxes with one of
 * them mostly empty is not parity, it is the same bug wearing a fixed box.
 *
 * CSS px and dp are both device-independent units, so the web's numbers carry
 * over; the height does not, because the phone's column is less than half as
 * wide.
 */
export const PANEL_HEIGHT = 300;

/**
 * The web's padding as fractions of its viewBox height (28 and 22 of 220), so
 * the margins scale with the panel instead of staying pinned to a 220 that no
 * longer exists. `PAD_X` stays absolute: it is a horizontal inset and the web's
 * 8px reads the same on a phone column.
 */
const PAD_X = 8;
const PAD_TOP_FRACTION = 28 / 220;
const PAD_BOTTOM_FRACTION = 22 / 220;

/** The web's label size, used directly because the drawing is 1:1. */
const LABEL_SIZE = 11;

export type EloPoint = { t: number; r: number };

export function EloChart({
  points,
  median,
  width,
  height,
}: {
  points: EloPoint[];
  median: number | null;
  /** Measured by the caller. */
  width: number;
  /** Measured by the caller, so both plots share one max height. */
  height: number;
}) {
  if (points.length < 2) {
    return (
      <Text style={styles.blank}>
        Answer more questions and your line draws itself here.
      </Text>
    );
  }

  const values = points.map((p) => p.r);
  const lo = Math.min(...values, median ?? Infinity);
  const hi = Math.max(...values, median ?? -Infinity);
  const span = Math.max(hi - lo, 40);
  const padTop = height * PAD_TOP_FRACTION;
  const plotH = height * (1 - PAD_TOP_FRACTION - PAD_BOTTOM_FRACTION);
  const x = (i: number) =>
    PAD_X + (i / (points.length - 1)) * (width - PAD_X * 2);
  const y = (r: number) => padTop + (1 - (r - lo) / span) * plotH;
  const line = points
    .map((p, i) => `${x(i).toFixed(1)},${y(p.r).toFixed(1)}`)
    .join(" ");

  return (
    // viewBox == the panel, so the default uniform scale is 1:1 and nothing is
    // distorted in either direction.
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {[0.15, 0.4, 0.65, 0.9].map((f) => {
        const v = Math.round(lo + span * f);
        return (
          <G key={f}>
            <Line
              x1={PAD_X}
              x2={width - PAD_X}
              y1={y(v)}
              y2={y(v)}
              stroke={colors.inkLine}
              strokeWidth={1}
            />
            <SvgText
              x={PAD_X + 2}
              y={y(v) - 4}
              fill={colors.muted}
              fontSize={LABEL_SIZE}
              fontFamily={fonts.mono}
            >
              {String(v)}
            </SvgText>
          </G>
        );
      })}
      {median !== null ? (
        <G>
          <Line
            x1={PAD_X}
            x2={width - PAD_X}
            y1={y(median)}
            y2={y(median)}
            stroke={colors.signal}
            strokeWidth={2}
          />
          <SvgText
            x={PAD_X + 2}
            y={y(median) - 6}
            fill={colors.signal}
            fontSize={LABEL_SIZE}
            fontFamily={fonts.mono}
          >
            {`median ${median}`}
          </SvgText>
        </G>
      ) : null}
      <Polyline
        points={line}
        fill="none"
        stroke={colors.paper}
        strokeWidth={1.5}
      />
    </Svg>
  );
}

export function Distribution({
  buckets,
  count,
  median,
  percentile,
  rating,
  width,
}: {
  buckets: number[];
  count: number;
  median: number | null;
  percentile: number | null;
  rating: number | null;
  /** Measured by the caller, so both plots share one max height. */
  width: number;
}) {
  if (count === 0) {
    return (
      <Text style={styles.blank}>
        No rated players yet — play and you set the curve.
      </Text>
    );
  }
  const max = Math.max(...buckets, 1);
  const marker =
    rating !== null
      ? Math.min(19, Math.max(0, Math.floor((rating - 600) / 80)))
      : null;
  // `gap-[3px]` on the web, in the same 20 buckets over the same measured width.
  const barWidth = Math.max(
    1,
    (width - 3 * (buckets.length - 1)) / buckets.length,
  );

  return (
    // Fixed height, with the histogram taking the remainder: whatever the axis
    // and caption need, the bars absorb the rest. So the panel is the same
    // height as the chart's no matter how the caption wraps.
    <View style={styles.panel}>
      <View style={styles.histogram}>
        {buckets.map((b, i) => (
          <View
            key={i}
            style={{
              width: barWidth,
              marginRight: 3,
              height: `${Math.max(2, (b / max) * 100)}%`,
              backgroundColor:
                marker === i ? colors.signal : "rgba(242,239,233,0.7)",
            }}
          />
        ))}
      </View>
      <View style={[styles.axis, { width }]}>
        <Text style={styles.axisLabel}>800</Text>
        <Text style={styles.axisLabel}>1600</Text>
        <Text style={styles.axisLabel}>2400</Text>
      </View>
      <Text style={styles.caption}>
        {percentile !== null && rating !== null ? (
          <>
            This is the rating distribution of {count} players
            {median !== null ? ` (median ${median})` : ""}. You at {rating} are
            better than <Text style={styles.signal}>{percentile}%</Text> of
            them.
          </>
        ) : (
          <>
            Rating distribution of {count} players
            {median !== null ? `, median ${median}` : ""}. Sign in to see where
            you land on it.
          </>
        )}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  blank: {
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 22,
    color: colors.muted,
    maxWidth: 380,
  },
  panel: { height: PANEL_HEIGHT },
  histogram: { flex: 1, flexDirection: "row", alignItems: "flex-end" },
  axis: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  axisLabel: { ...label, color: colors.muted },
  caption: {
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 22,
    color: colors.muted,
    marginTop: 16,
    maxWidth: 480,
  },
  signal: { color: colors.signal },
});
