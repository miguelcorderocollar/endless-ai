import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Simple model (issue #27): git (`content/questions/*.json`) is the draft
 * space, Convex holds the published set only — one doc per stable questionId.
 * No snapshots, no content versions, no per-question history. Adding one
 * question costs one write; publish upserts the diff.
 *
 * Auth (#2) will add login and gate writes. Until then `answerEvents` has no
 * writers yet (#3/#4 add server-side Elo), and publishing runs through an
 * internal mutation via authenticated CLI, never from the client.
 */
const source = v.union(
  v.object({ kind: v.literal("wikipedia"), title: v.string(), label: v.string() }),
  v.object({ kind: v.literal("url"), url: v.string(), label: v.string() }),
  v.object({ kind: v.literal("none") }),
);

export const questionFields = {
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
};

export default defineSchema({
  questions: defineTable({
    ...questionFields,
    status: v.union(v.literal("published"), v.literal("archived")),
    updatedAt: v.number(),
    commit: v.optional(v.string()),
  })
    .index("by_questionId", ["questionId"])
    .index("by_status", ["status"]),

  users: defineTable({
    handle: v.optional(v.string()),
    displayName: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_handle", ["handle"]),

  answerEvents: defineTable({
    userId: v.id("users"),
    questionId: v.id("questions"),
    category: v.string(),
    difficulty: v.number(),
    correct: v.boolean(),
    ratingBefore: v.number(),
    ratingAfter: v.number(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId", "createdAt"])
    .index("by_user_question", ["userId", "questionId"]),
});
