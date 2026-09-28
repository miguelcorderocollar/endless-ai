import { Quiz } from "@/components/Quiz";
import { loadBank, publishedOnly } from "@/lib/questions/load";
import type { Question } from "@/lib/questions/schema";

export const dynamic = "force-dynamic";

/**
 * The first question is picked per visit so every run starts somewhere
 * different. Done on the server per request so the initial HTML already
 * contains a real (random) question with no hydration flash.
 */
function pickOpeningQuestion(bank: Question[]): Question {
  const first = bank[0];
  if (!first) throw new Error("Question bank is empty, run `npm run validate`");
  return bank[Math.floor(Math.random() * bank.length)]!;
}

export default function Home() {
  const { questions } = loadBank();
  const bank = publishedOnly(questions);

  return <Quiz bank={bank} initial={pickOpeningQuestion(bank)} />;
}
