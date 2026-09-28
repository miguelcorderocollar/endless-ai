import { readFileSync, readdirSync } from "fs";
import { join } from "path";

import { type Question, questionSchema } from "./schema";

export const CONTENT_DIR = join(process.cwd(), "content", "questions");

export type LoadedBank = {
  questions: Question[];
  fileErrors: { file: string; issues: string[] }[];
};

export function loadBank(dir: string = CONTENT_DIR): LoadedBank {
  const questions: Question[] = [];
  const fileErrors: LoadedBank["fileErrors"] = [];

  let files: string[];
  try {
    files = readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
  } catch {
    return { questions, fileErrors: [{ file: dir, issues: ["directory not found"] }] };
  }

  for (const file of files) {
    const raw = readFileSync(join(dir, file), "utf8");
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      fileErrors.push({
        file,
        issues: [`invalid JSON: ${(err as Error).message}`],
      });
      continue;
    }

    if (!Array.isArray(parsed)) {
      fileErrors.push({ file, issues: ["top level value must be an array"] });
      continue;
    }

    parsed.forEach((entry, index) => {
      const result = questionSchema.safeParse(entry);
      if (!result.success) {
        fileErrors.push({
          file: `${file}[${index}]`,
          issues: result.error.issues.map(
            (i) => `${i.path.join(".") || "(root)"}: ${i.message}`,
          ),
        });
        return;
      }
      questions.push(result.data);
    });
  }

  return { questions, fileErrors };
}

export function publishedOnly(questions: Question[]): Question[] {
  return questions.filter((q) => q.status === "published");
}
