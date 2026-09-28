import { z } from "zod";

export const CATEGORIES = [
  { prefix: "hst", key: "history", label: "History" },
  { prefix: "ppl", key: "people", label: "People" },
  { prefix: "lab", key: "labs", label: "Labs" },
  { prefix: "mod", key: "models", label: "Models" },
  { prefix: "tec", key: "technology", label: "Technology" },
  { prefix: "hwr", key: "hardware", label: "Hardware" },
  { prefix: "pap", key: "papers", label: "Papers" },
  { prefix: "ben", key: "benchmarks", label: "Benchmarks" },
  { prefix: "mem", key: "memes", label: "Memes" },
  { prefix: "eth", key: "ethics", label: "Ethics" },
  { prefix: "bus", key: "business", label: "Business" },
  { prefix: "pro", key: "products", label: "Products" },
  { prefix: "oss", key: "open-source", label: "Open source" },
  { prefix: "con", key: "concepts", label: "Concepts" },
] as const;

export type CategoryKey = (typeof CATEGORIES)[number]["key"];

export const CATEGORY_KEYS = CATEGORIES.map((c) => c.key) as [CategoryKey, ...CategoryKey[]];

export const CATEGORY_PREFIXES = CATEGORIES.map((c) => c.prefix);

export function categoryLabel(key: CategoryKey): string {
  return CATEGORIES.find((c) => c.key === key)?.label ?? key;
}

export const PREFIX_BY_KEY = Object.fromEntries(
  CATEGORIES.map((c) => [c.key, c.prefix]),
) as Record<CategoryKey, string>;

export const wikipediaSourceSchema = z.object({
  kind: z.literal("wikipedia"),
  title: z.string().min(1),
  label: z.string().min(1),
});

export const urlSourceSchema = z.object({
  kind: z.literal("url"),
  url: z.url(),
  label: z.string().min(1),
});

export const noSourceSchema = z.object({
  kind: z.literal("none"),
});

export const sourceSchema = z.discriminatedUnion("kind", [
  wikipediaSourceSchema,
  urlSourceSchema,
  noSourceSchema,
]);

export type QuestionSource = z.infer<typeof sourceSchema>;

export const questionSchema = z.object({
  id: z
    .string()
    .regex(/^[a-z]{3}-\d{4}$/, "id must look like 'hist-0001'"),
  text: z.string().min(10).max(400),
  options: z
    .array(z.string().min(1).max(120))
    .length(4, "a question must have exactly 4 options"),
  answer: z.string().min(1),
  category: z.enum(CATEGORY_KEYS),
  tags: z.array(z.string().min(1)).max(6).default([]),
  difficulty: z.number().int().min(1).max(5),
  explanation: z.string().min(20).max(600),
  source: sourceSchema,
  answerAliases: z.array(z.string().min(1)).max(8).default([]),
  status: z.enum(["draft", "review", "published", "rejected"]).default("draft"),
  addedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "addedAt must be YYYY-MM-DD"),
});

export type Question = z.infer<typeof questionSchema>;

/** The Learn button target, or null when the question has no verifiable source. */
export function sourceHref(source: QuestionSource): string | null {
  switch (source.kind) {
    case "wikipedia":
      return `https://en.wikipedia.org/wiki/${encodeURIComponent(
        source.title.replace(/ /g, "_"),
      )}`;
    case "url":
      return source.url;
    case "none":
      return null;
  }
}

export function sourceLabel(source: QuestionSource): string | null {
  switch (source.kind) {
    case "wikipedia":
      return source.label;
    case "url":
      return source.label;
    case "none":
      return null;
  }
}
