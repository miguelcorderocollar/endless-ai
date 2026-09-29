import { v } from "convex/values";

import { internalMutation } from "./_generated/server";

/**
 * Seed maintenance (#11). Seed users sign up with `@seed.endless-ai.test`
 * emails so one predicate finds them all. Deleting a seed user cascades to
 * their events, stats, and auth rows — the same cascade a future
 * delete-account feature must implement.
 *
 * No unbounded collects: users paginate, everything else goes by
 * user-keyed indexes. (authVerificationCodes/authVerifiers are skipped: the
 * password-only setup never writes them.)
 */
export const cleanupSeed = internalMutation({
  args: {
    domain: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const domain = args.domain ?? "@seed.endless-ai.test";
    let users = 0;
    let events = 0;
    let stats = 0;
    let authRows = 0;

    let cursor: string | null = null;
    for (;;) {
      const page = await ctx.db.query("users").paginate({ cursor, numItems: 200 });
      for (const user of page.page) {
        if (!user.email?.endsWith(domain)) continue;
        users++;

        const userEvents = await ctx.db
          .query("answerEvents")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .collect();
        for (const doc of userEvents) {
          await ctx.db.delete(doc._id);
          events++;
        }

        const userStatRows = await ctx.db
          .query("userStats")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .collect();
        for (const doc of userStatRows) {
          await ctx.db.delete(doc._id);
          stats++;
        }

        const accounts = await ctx.db
          .query("authAccounts")
          .withIndex("userIdAndProvider", (q) => q.eq("userId", user._id))
          .collect();
        for (const doc of accounts) {
          await ctx.db.delete(doc._id);
          authRows++;
        }

        const sessions = await ctx.db
          .query("authSessions")
          .withIndex("userId", (q) => q.eq("userId", user._id))
          .collect();
        for (const session of sessions) {
          const tokens = await ctx.db
            .query("authRefreshTokens")
            .withIndex("sessionId", (q) => q.eq("sessionId", session._id))
            .collect();
          for (const token of tokens) {
            await ctx.db.delete(token._id);
            authRows++;
          }
          await ctx.db.delete(session._id);
          authRows++;
        }

        await ctx.db.delete(user._id);
      }
      if (page.isDone) break;
      cursor = page.continueCursor;
    }
    return { users, events, stats, authRows };
  },
});
