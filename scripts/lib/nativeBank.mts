import { join } from "node:path";
import { readFileSync } from "node:fs";

import { buildBankBundle, nativeBankBundlePath } from "../../src/lib/questions/bankBundle";
import { parseBankFile } from "../../src/lib/questions/bankFile";

/**
 * Checks the native app's committed bank asset against `content/questions`.
 *
 * `public/bank.json` is regenerated on every Next build, so it cannot drift. The
 * native one cannot: Metro resolves `assets/bank.json` at bundle time and a
 * Next config hook has nothing to hook into. So the file is committed and this
 * check is the thing that keeps it honest — run from `npm run validate`, which
 * is the gate every content change already passes through.
 *
 * Compares the parsed content, not the bytes, so reformatting the JSON is not a
 * failure while a changed question is. Returns a reason string when it is
 * stale, or null when it matches.
 */
export function checkNativeBank(projectRoot: string): string | null {
  const path = nativeBankBundlePath(projectRoot);
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    return `${path} is missing. Run \`npm run bundle:bank\`.`;
  }

  let committed: unknown;
  try {
    committed = JSON.parse(raw);
  } catch (error) {
    return `${path} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`;
  }

  const expected = buildBankBundle(join(projectRoot, "content", "questions"));
  const committedQuestions = parseBankFile(committed);
  if (committedQuestions.length !== expected.count) {
    return (
      `${path} holds ${committedQuestions.length} usable questions, ` +
      `content/questions has ${expected.count}. Run \`npm run bundle:bank\`.`
    );
  }
  if (JSON.stringify(committedQuestions) !== JSON.stringify(expected.questions)) {
    return `${path} differs from content/questions. Run \`npm run bundle:bank\`.`;
  }
  return null;
}
