import {
  type CategoryKey,
  type Question,
  questionSchema,
} from "@shared/lib/questions/schema";

/**
 * A row as Convex returns it: the published question plus the document
 * bookkeeping Convex adds (`_id`, `_creationTime`, `status`, `updatedAt`) and
 * the `questionId` → `id` rename from the publish pipeline.
 *
 * `answerAliases` is git-only — it never reaches Convex, because the server
 * never needs to grade a free-text answer — so it comes back empty. It is a
 * defaulted field on the schema, which is why the row type below can omit it
 * without lying about what is required.
 */
export type ConvexQuestionRow = {
  questionId: string;
  text: string;
  options: string[];
  answer: string;
  category: string;
  difficulty: number;
  explanation: string;
  source: unknown;
  tags: string[];
  addedAt: string;
};

const LETTERS = ["A", "B", "C", "D"] as const;

/**
 * Draw rows to playable questions, validating through the shared schema so a
 * bad row is dropped here rather than crashing a question screen three frames
 * later. This is the same `questionSchema` the web app and `npm run validate`
 * use, so a row that fails this is a content bug the pipeline should have
 * caught, not a mobile-only problem.
 *
 * Returns the questions that survived, so a caller cannot accidentally treat a
 * partial page as a full one — it draws again if the yield is short.
 */
export function toQuestions(rows: ConvexQuestionRow[]): Question[] {
  const out: Question[] = [];
  for (const row of rows) {
    const parsed = questionSchema.safeParse({
      id: row.questionId,
      text: row.text,
      options: row.options,
      answer: row.answer,
      category: row.category,
      difficulty: row.difficulty,
      explanation: row.explanation,
      source: row.source,
      tags: row.tags,
      addedAt: row.addedAt,
      answerAliases: [],
      status: "published",
    });
    if (parsed.success) {
      out.push(parsed.data);
    } else {
      console.warn(
        `[bank] dropping ${row.questionId}: ${parsed.error.issues[0]?.message ?? "invalid"}`,
      );
    }
  }
  return out;
}

export function optionLetter(index: number): string {
  return LETTERS[index] ?? "?";
}

/** The category a filter is for, narrowed to the keys the schema allows. */
export function asCategoryKeys(keys: string[]): CategoryKey[] {
  const known = new Set<string>(questionSchema.shape.category.options);
  return keys.filter((k): k is CategoryKey => known.has(k));
}
