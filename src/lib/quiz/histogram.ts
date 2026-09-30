/**
 * The rating histogram's geometry, shared by the server that builds it
 * (`convex/stats.ts`), the web chart (`src/components/Stats.tsx`) and the
 * native chart (`apps/mobile/src/components/Stats.tsx`).
 *
 * Three numbers and two rules that used to be restated in all three places:
 * the histogram covers 600–2200 in 20 bins, a rating maps to a bin by
 * `(rating - MIN) / WIDTH`, and the Elo chart floors a flat series at a span of
 * 40 with gridlines at 15/40/65/90% of the span. The population query, the
 * marker math and the axis ticks all derive from these, so a change lands
 * everywhere or nowhere.
 *
 * The axis annotations (`800 / 1600 / 2400`) are deliberately not here. They
 * are labels under a bar chart, not geometry — the web picked them as round
 * numbers at roughly thirds, and both views render the same three strings.
 */

export const HISTOGRAM_MIN = 600;
export const HISTOGRAM_MAX = 2200;
export const HISTOGRAM_BINS = 20;

/** Width of one bin in rating points. */
export const HISTOGRAM_WIDTH = (HISTOGRAM_MAX - HISTOGRAM_MIN) / HISTOGRAM_BINS;

/** Which bin a rating falls in, clamped to the histogram. */
export function bucketForRating(rating: number): number {
  return Math.min(
    HISTOGRAM_BINS - 1,
    Math.max(0, Math.floor((rating - HISTOGRAM_MIN) / HISTOGRAM_WIDTH)),
  );
}

/**
 * Minimum value span for the Elo-over-time chart. Without it a flat rating
 * gets a wildly magnified axis; with it a player who never moves still sees a
 * calm line.
 */
export const CHART_MIN_SPAN = 40;

/** Gridlines as fractions of the value span, weakest to strongest. */
export const GRID_FRACTIONS = [0.15, 0.4, 0.65, 0.9] as const;
