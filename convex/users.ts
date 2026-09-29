import { ConvexError, v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { isAdminEmail, requireAdmin, requireUser } from "./access";
import { STARTING_ELO } from "../src/lib/quiz/elo";

const HANDLE_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

function randomHandle(): string {
  let suffix = "";
  for (let i = 0; i < 4; i++) {
    suffix += HANDLE_ALPHABET[Math.floor(Math.random() * HANDLE_ALPHABET.length)];
  }
  return `player-${suffix}`;
}

/** Current signed-in profile, or null for guests. */
export const me = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;
    return {
      handle: user.handle ?? null,
      displayName: user.displayName ?? null,
      role: user.role ?? "user",
      isAnonymous: user.isAnonymous ?? false,
    };
  },
});

/**
 * Backfills profile defaults for rows auth created without them (anonymous
 * sign-in, or signups predating a field). Only fills missing fields — it
 * never overwrites role/tier, so it cannot escalate. Idempotent.
 */
export const ensureProfile = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    const user = await ctx.db.get(userId);
    if (!user) throw new ConvexError("No such user.");

    const patch: {
      handle?: string;
      role?: "user" | "admin";
      tier?: "free";
      createdAt?: number;
    } = {};

    if (!user.handle) {
      for (let attempt = 0; attempt < 5; attempt++) {
        const candidate = randomHandle();
        const taken = await ctx.db
          .query("users")
          .withIndex("by_handle", (q) => q.eq("handle", candidate))
          .take(1);
        if (taken.length === 0) {
          patch.handle = candidate;
          break;
        }
      }
      patch.handle ??= `player-${userId.slice(-6)}`;
    }
    if (!user.role) {
      patch.role = isAdminEmail(user.email) ? "admin" : "user";
    }
    if (!user.tier) patch.tier = "free";
    if (!user.createdAt) patch.createdAt = user._creationTime;

    if (Object.keys(patch).length > 0) await ctx.db.patch(userId, patch);
    return { ok: true };
  },
});

/** Rename yourself. */
export const setDisplayName = mutation({
  args: { displayName: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const name = args.displayName.trim().slice(0, 40);
    if (name.length === 0) throw new ConvexError("Display name cannot be empty.");
    await ctx.db.patch(userId, { displayName: name });
    return { ok: true };
  },
});

/**
 * Seeds the rollup from device-local progress at signup (#34, lazy guests).
 * Only when the user has neither stats nor events — i.e. the account is brand
 * new. An existing account (stats or events present) keeps its server history:
 * local totals are ignored and nothing is overwritten, so logging into an
 * existing account from a device with guest progress leaves that account
 * untouched. Idempotent.
 *
 * Edge case: stats doc missing but events present (pre-rollup accounts). The
 * rollup is rebuilt by folding the account's own events — still never from
 * local — so the existing history stays visible.
 */
export const claimProgress = mutation({
  args: {
    rating: v.number(),
    answered: v.number(),
    correct: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);

    const existingStats = await ctx.db
      .query("userStats")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(1);
    if (existingStats.length > 0) return { seeded: false };

    const hasEvents =
      (
        await ctx.db
          .query("answerEvents")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .take(1)
      ).length > 0;
    if (hasEvents) {
      await rebuildStatsFromOwnEvents(ctx, userId);
      return { seeded: false };
    }

    const answered = Math.max(0, Math.floor(args.answered));
    const correct = Math.min(Math.max(0, Math.floor(args.correct)), answered);
    const rating = Math.min(Math.max(Math.round(args.rating) || 1000, 0), 3000);

    // Nothing played locally: leave the account stat-free so it does not show
    // up in population stats until it has real answers.
    if (answered === 0) return { seeded: false };

    await ctx.db.insert("userStats", {
      userId,
      rating,
      answered,
      correct,
      streak: 0,
      bestStreak: 0,
      byCategory: [],
      seeded: true,
      updatedAt: Date.now(),
    });
    return { seeded: true };
  },
});

/**
 * Rebuilds a missing rollup from the account's own events only. Used when an
 * existing account predates userStats: the existing history stays (rating =
 * latest event, counts folded), device-local totals are ignored.
 */
async function rebuildStatsFromOwnEvents(ctx: MutationCtx, userId: Id<"users">) {
  let answered = 0;
  let correct = 0;
  let bestStreak = 0;
  let trailingStreak = 0;
  let rating = STARTING_ELO;
  const byCategory: { category: string; answered: number; correct: number }[] = [];
  let cursor: string | null = null;

  for (let pages = 0; pages < 40; pages++) {
    const page = await ctx.db
      .query("answerEvents")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .paginate({ cursor, numItems: 500 });
    for (const e of page.page) {
      answered += 1;
      rating = e.ratingAfter;
      if (e.correct) {
        correct += 1;
        trailingStreak += 1;
        bestStreak = Math.max(bestStreak, trailingStreak);
      } else {
        trailingStreak = 0;
      }
      const entry = byCategory.find((c) => c.category === e.category);
      if (entry) {
        entry.answered += 1;
        if (e.correct) entry.correct += 1;
      } else {
        byCategory.push({
          category: e.category,
          answered: 1,
          correct: e.correct ? 1 : 0,
        });
      }
    }
    if (page.isDone) break;
    cursor = page.continueCursor;
  }

  await ctx.db.insert("userStats", {
    userId,
    rating,
    answered,
    correct,
    streak: trailingStreak,
    bestStreak,
    byCategory,
    updatedAt: Date.now(),
  });
}

/**
 * Wipes the caller's play history: all answer events and their rollup. The
 * account, handle, and role survive — only the points/history go. This is the
 * "start over" button and is irreversible by design.
 */
export const resetProgress = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    let events = 0;
    let stats = 0;

    let cursor: string | null = null;
    for (;;) {
      const page = await ctx.db
        .query("answerEvents")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .paginate({ cursor, numItems: 200 });
      for (const doc of page.page) {
        await ctx.db.delete(doc._id);
        events++;
      }
      if (page.isDone) break;
      cursor = page.continueCursor;
    }

    const statRows = await ctx.db
      .query("userStats")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const doc of statRows) {
      await ctx.db.delete(doc._id);
      stats++;
    }

    return { events, stats };
  },
});

/**
 * Proves the admin gate from #2: population counts for future admin tooling
 * (#30). Throws "Admin only." for everyone else.
 */
export const adminStats = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const [users, questions] = await Promise.all([
      ctx.db.query("users").take(1000),
      ctx.db.query("questions").take(20000),
    ]);
    return {
      users: users.length,
      questions: questions.length,
      admins: users.filter((u) => u.role === "admin").length,
    };
  },
});
