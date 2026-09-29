import { ConvexError, v } from "convex/values";

import { mutation } from "./_generated/server";
import { requireUser } from "./access";
import { STARTING_ELO, scoreAnswer } from "../src/lib/quiz/elo";

/**
 * Records one answered question and moves Elo — the only writer of both
 * (#3 + #4). The client computes nothing; the returned rating is truth and
 * the client reconciles its local cache to it.
 *
 * Event-sourced rating: the player's current rating is the latest event's
 * `ratingAfter` (STARTING_ELO when there are no events), so no rating column
 * is needed on `users` and replays can't drift it.
 *
 * Guards:
 * - unknown or archived questions are rejected (client plays published only)
 * - same verdict within 5s of the previous event for the same question is a
 *   network retry: returns the previous result without inserting. A changed
 *   verdict (wrong then right) always records as a new event.
 */
export const answer = mutation({
  args: {
    questionId: v.string(),
    picked: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);

    const question = await ctx.db
      .query("questions")
      .withIndex("by_questionId", (q) => q.eq("questionId", args.questionId))
      .take(1)
      .then((rows) => rows[0]);
    if (!question || question.status !== "published") {
      throw new ConvexError("Unknown question.");
    }

    const recent = await ctx.db
      .query("answerEvents")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(1);
    const last = recent[0] ?? null;
    const ratingBefore = last?.ratingAfter ?? STARTING_ELO;

    const lastSame =
      last && last.questionId === question._id
        ? last
        : (
            await ctx.db
              .query("answerEvents")
              .withIndex("by_user_question", (q) =>
                q.eq("userId", userId).eq("questionId", question._id),
              )
              .order("desc")
              .take(1)
          )[0] ?? null;
    const correct = args.picked === question.answer;
    // Same outcome within 5s of the previous event for this question means a
    // network retry, not a new attempt — return the previous result without
    // inserting. A changed verdict (wrong then right) always records.
    if (lastSame && Date.now() - lastSame.createdAt < 5000 && lastSame.correct === correct) {
      return {
        correct: lastSame.correct,
        ratingBefore: lastSame.ratingBefore,
        ratingAfter: lastSame.ratingAfter,
        delta: lastSame.ratingAfter - lastSame.ratingBefore,
        deduped: true,
      };
    }

    const { delta, rating } = scoreAnswer(ratingBefore, question.difficulty, correct);

    await ctx.db.insert("answerEvents", {
      userId,
      questionId: question._id,
      category: question.category,
      difficulty: question.difficulty,
      correct,
      ratingBefore,
      ratingAfter: rating,
      createdAt: Date.now(),
    });

    return {
      correct,
      ratingBefore,
      ratingAfter: rating,
      delta: Math.round(delta * 10) / 10,
      deduped: false,
    };
  },
});
