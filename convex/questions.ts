import { v } from "convex/values";

import { internalMutation, query } from "./_generated/server";
import { questionFields } from "./schema";

/** Published bank for play. Drafts live in git; only `published` ships. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("questions")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .collect();
  },
});

const sameStrings = (a: string[], b: string[]) =>
  a.length === b.length && a.every((s, i) => s === b[i]);

/**
 * Upsert one batch of the validated bank. Internal on purpose: publish via
 * authenticated `npx convex run` (see `scripts/publish.mts`), never from the
 * client. Matches per stable `questionId`: inserts new rows, patches changed
 * ones. Run `prune` afterwards to archive rows deleted from git.
 */
export const sync = internalMutation({
  args: {
    commit: v.optional(v.string()),
    questions: v.array(v.object(questionFields)),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db.query("questions").collect();
    const byId = new Map(existing.map((d) => [d.questionId, d]));

    let inserted = 0;
    let updated = 0;

    for (const q of args.questions) {
      const doc = byId.get(q.questionId);
      if (!doc) {
        await ctx.db.insert("questions", {
          ...q,
          status: "published",
          updatedAt: now,
          commit: args.commit,
        });
        inserted += 1;
        continue;
      }
      if (
        doc.status !== "published" ||
        doc.text !== q.text ||
        !sameStrings(doc.options, q.options) ||
        doc.answer !== q.answer ||
        doc.category !== q.category ||
        doc.difficulty !== q.difficulty ||
        doc.explanation !== q.explanation ||
        JSON.stringify(doc.source) !== JSON.stringify(q.source) ||
        !sameStrings(doc.tags, q.tags) ||
        doc.addedAt !== q.addedAt
      ) {
        await ctx.db.patch(doc._id, {
          ...q,
          status: "published",
          updatedAt: now,
          commit: args.commit,
        });
        updated += 1;
      }
    }

    return {
      inserted,
      updated,
      unchanged: args.questions.length - inserted - updated,
    };
  },
});

/**
 * Archive published rows missing from the bank (deleted in git). Takes only
 * the id list, so it stays tiny no matter the bank size.
 */
export const prune = internalMutation({
  args: {
    keepIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const keep = new Set(args.keepIds);
    const existing = await ctx.db
      .query("questions")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .collect();
    let archived = 0;
    for (const doc of existing) {
      if (!keep.has(doc.questionId)) {
        await ctx.db.patch(doc._id, {
          status: "archived",
          updatedAt: Date.now(),
        });
        archived += 1;
      }
    }
    return { archived };
  },
});
