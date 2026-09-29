import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * No-runs model (Sep 2026): the game is a pure endless stream. There is no
 * `runs` table. Every answered question is an `answerEvents` row carrying its
 * content version; stats, repeat-avoidance, and streaks all derive from events.
 *
 * Auth (#2) will extend `users` and lock down writes. Until then `userId` on
 * answer events is an unauthenticated device id and `publishSnapshot` is
 * callable by anyone with the deployment URL (dev/local only).
 */
const source = v.union(
  v.object({ kind: v.literal("wikipedia"), title: v.string(), label: v.string() }),
  v.object({ kind: v.literal("url"), url: v.string(), label: v.string() }),
  v.object({ kind: v.literal("none") }),
);

export const snapshotQuestion = v.object({
  questionId: v.string(),
  text: v.string(),
  options: v.array(v.string()),
  answer: v.string(),
  category: v.string(),
  difficulty: v.number(),
  explanation: v.string(),
  source,
  tags: v.array(v.string()),
  addedAt: v.string(),
});

export default defineSchema({
  contentVersions: defineTable({
    version: v.number(),
    questionCount: v.number(),
    createdAt: v.number(),
    commit: v.optional(v.string()),
  }).index("by_version", ["version"]),

  questionSnapshots: defineTable({
    contentVersion: v.number(),
    ...snapshotQuestion.fields,
  })
    .index("by_version", ["contentVersion"])
    .index("by_question", ["questionId", "contentVersion"]),

  users: defineTable({
    handle: v.optional(v.string()),
    displayName: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_handle", ["handle"]),

  answerEvents: defineTable({
    userId: v.string(),
    questionId: v.string(),
    category: v.string(),
    difficulty: v.number(),
    correct: v.boolean(),
    ratingBefore: v.number(),
    ratingAfter: v.number(),
    contentVersion: v.number(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId", "createdAt"])
    .index("by_user_question", ["userId", "questionId"]),
});
