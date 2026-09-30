import { StyleSheet, Text, View } from "react-native";
import Svg, { G, Line, Polyline, Text as SvgText } from "react-native-svg";

import { BOTTOM_INSET, colors, fonts, label } from "@/theme";

/**
 * The Elo-over-time chart (`src/components/Stats.tsx` on the web), redrawn in
 * `react-native-svg` rather than a chart library.
 *
 * The geometry is deliberately the same arithmetic as the web's: same viewBox
 * proportions, same four gridlines at 15/40/65/90% of the value span, same
 * signal-coloured median line, same `Math.max(hi - lo, 40)` floor so a flat
 * rating does not get a wildly magnified axis. Two views of the same data that
 * disagree by a few pixels would read as a bug in the app, which is the thing
 * this whole pass exists to prevent.
 *
 * `preserveAspectRatio="none"` has no SVG meaning on native — the chart is laid
 * out by `onLayout` instead, so the same 560x220 design box is stretched to the
 * measured width. That is the one place the two implementations differ, and it
 * is a layout fact rather than a visual choice.
 */

const W = 560;
const H = 220;
const PAD_X = 8;
const PAD_TOP = 28;
const PAD_BOTTOM = 22;

export type EloPoint = { t: number; r: number };

export function EloChart({
  points,
  median,
  width,
}: {
  points: EloPoint[];
  median: number | null;
  /** Measured by the caller; the design box is 560 wide. */
  width: number;
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
  const plotH = H - PAD_TOP - PAD_BOTTOM;
  const x = (i: number) => PAD_X + (i / (points.length - 1)) * (W - PAD_X * 2);
  const y = (r: number) => PAD_TOP + (1 - (r - lo) / span) * plotH;
  const line = points
    .map((p, i) => `${x(i).toFixed(1)},${y(p.r).toFixed(1)}`)
    .join(" ");

  return (
    <Svg width={width} height={H * (width / W)} viewBox={`0 0 ${W} ${H}`}>
      {[0.15, 0.4, 0.65, 0.9].map((f) => {
        const v = Math.round(lo + span * f);
        return (
          <G key={f}>
            <Line
              x1={PAD_X}
              x2={W - PAD_X}
              y1={y(v)}
              y2={y(v)}
              stroke={colors.inkLine}
              strokeWidth={1}
            />
            <SvgText
              x={PAD_X + 2}
              y={y(v) - 4}
              fill={colors.muted}
              fontSize={11}
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
            x2={W - PAD_X}
            y1={y(median)}
            y2={y(median)}
            stroke={colors.signal}
            strokeWidth={2}
          />
          <SvgText
            x={PAD_X + 2}
            y={y(median) - 6}
            fill={colors.signal}
            fontSize={11}
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
    <View>
      <View style={[styles.histogram, { height: 240 }]}>
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
  histogram: { flexDirection: "row", alignItems: "flex-end" },
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
    paddingBottom: BOTTOM_INSET,
  },
  signal: { color: colors.signal },
});
