import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

/**
 * Simple model (issue #27): git (`content/questions/*.json`) is the draft
 * space, Convex holds the published set only — one doc per stable questionId.
 * No snapshots, no content versions, no per-question history.
 *
 * Auth (#2): Convex Auth owns identity. The `users` table below extends the
 * auth `users` table — every custom field stays optional because auth creates
 * rows (anonymous + password signup) without them; `ensureProfile`
 * (`convex/users.ts`) backfills handle/role/tier/createdAt. Never take `role`
 * from client params; it is assigned server-side from ADMIN_EMAILS.
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

export const roleValidator = v.union(v.literal("user"), v.literal("admin"));
export const tierValidator = v.union(v.literal("free"), v.literal("paid"));

export default defineSchema({
  ...authTables,

  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    handle: v.optional(v.string()),
    displayName: v.optional(v.string()),
    role: v.optional(roleValidator),
    tier: v.optional(tierValidator),
    createdAt: v.optional(v.number()),
  })
    .index("email", ["email"])
    .index("by_handle", ["handle"]),

  questions: defineTable({
    ...questionFields,
    status: v.union(v.literal("published"), v.literal("archived")),
    updatedAt: v.number(),
    commit: v.optional(v.string()),
  })
    .index("by_questionId", ["questionId"])
    .index("by_status", ["status"]),

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
