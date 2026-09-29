import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Stats reads (#11). Everything here derives from userStats (one doc per
 * user) or bounded event pages — never a global event scan. Population math
 * caps at 5000 ratings with `capped: true` past that; the aggregate component
 * (#8) takes over for exact global rank at real scale.
 */

const HISTORY_POINTS = 500;
const POPULATION_CAP = 5000;
const HISTOGRAM_BINS = 20;
const HISTOGRAM_MIN = 600;
const HISTOGRAM_MAX = 2200;

/** Caller's rating series for the Elo-over-time chart, downsampled. */
export const history = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const points: { t: number; r: number }[] = [];
    let cursor: string | null = null;
    for (let pages = 0; pages < 40 && points.length < 20000; pages++) {
      const page = await ctx.db
        .query("answerEvents")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .paginate({ cursor, numItems: 500 });
      for (const e of page.page) points.push({ t: e.createdAt, r: e.ratingAfter });
      if (page.isDone) break;
      cursor = page.continueCursor;
    }
    if (points.length <= HISTORY_POINTS) return points;
    const stride = points.length / HISTORY_POINTS;
    return points.filter((_, i) => Math.floor(i % stride) === 0);
  },
});

export type Population = {
  count: number;
  median: number | null;
  buckets: number[];
  percentile: number | null;
  capped: boolean;
};

/**
 * Population ratings for the distribution view: median line, histogram, and
 * the caller's percentile. Bounded take — exact while small, approximate
 * past POPULATION_CAP (flagged), exact again via aggregate at #8.
 */
export const population = query({
  args: {},
  handler: async (ctx): Promise<Population> => {
    const rows = await ctx.db
      .query("userStats")
      .withIndex("by_rating")
      .order("desc")
      .take(POPULATION_CAP + 1);
    const capped = rows.length > POPULATION_CAP;
    const ratings = rows
      .slice(0, POPULATION_CAP)
      .filter((r) => r.answered > 0)
      .map((r) => r.rating);
    if (ratings.length === 0) {
      return { count: 0, median: null, buckets: new Array(HISTOGRAM_BINS).fill(0), percentile: null, capped };
    }

    const sorted = [...ratings].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)] ?? null;

    const width = (HISTOGRAM_MAX - HISTOGRAM_MIN) / HISTOGRAM_BINS;
    const buckets = new Array(HISTOGRAM_BINS).fill(0) as number[];
    for (const r of ratings) {
      const i = Math.min(
        HISTOGRAM_BINS - 1,
        Math.max(0, Math.floor((r - HISTOGRAM_MIN) / width)),
      );
      buckets[i] = (buckets[i] ?? 0) + 1;
    }

    const userId = await getAuthUserId(ctx);
    let percentile: number | null = null;
    if (userId) {
      const mine = await ctx.db
        .query("userStats")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .take(1)
        .then((r) => r[0]);
      if (mine) {
        const below = sorted.filter((r) => r < mine.rating).length;
        percentile = Math.round((below / sorted.length) * 100);
      }
    }

    return { count: ratings.length, median, buckets, percentile, capped };
  },
});
