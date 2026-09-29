import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { snapshotQuestion } from "./schema";

/** Latest published snapshot, or null when nothing has been published yet. */
export const latest = query({
  args: {},
  handler: async (ctx) => {
    const heads = await ctx.db
      .query("contentVersions")
      .withIndex("by_version")
      .order("desc")
      .take(1);
    const head = heads[0];
    if (!head) return null;
    const questions = await ctx.db
      .query("questionSnapshots")
      .withIndex("by_version", (q) => q.eq("contentVersion", head.version))
      .collect();
    return {
      version: head.version,
      questionCount: head.questionCount,
      createdAt: head.createdAt,
      questions,
    };
  },
});

/**
 * Publish a new snapshot. Idempotent per version: re-publishing an existing
 * version returns `{ deduped: true }` without writing rows.
 *
 * TODO(#2): restrict to an admin identity once Convex Auth lands. Until then
 * this is callable by anyone with the deployment URL — dev/local only.
 */
export const publishSnapshot = mutation({
  args: {
    version: v.number(),
    commit: v.optional(v.string()),
    questions: v.array(snapshotQuestion),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("contentVersions")
      .withIndex("by_version", (q) => q.eq("version", args.version))
      .take(1);
    if (existing.length > 0) return { deduped: true, version: args.version };

    const now = Date.now();
    await ctx.db.insert("contentVersions", {
      version: args.version,
      questionCount: args.questions.length,
      createdAt: now,
      commit: args.commit,
    });
    for (const q of args.questions) {
      await ctx.db.insert("questionSnapshots", {
        contentVersion: args.version,
        ...q,
      });
    }
    return { deduped: false, version: args.version, count: args.questions.length };
  },
});
