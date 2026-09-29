import { ConvexError, v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

import { mutation, query } from "./_generated/server";
import { isAdminEmail, requireAdmin, requireUser } from "./access";

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
