import { expect, test as base } from "@playwright/test";
import type { Page } from "@playwright/test";

declare global {
  interface Window {
    /** Set by the fake `beforeinstallprompt` below. */
    __installPromptShown?: boolean;
  }
}

/**
 * Every spec here runs against a seeded local bank, with Convex cut off.
 *
 * Two reasons, and the second is the important one. A live deployment would
 * make every assertion a race against a query that might return a different
 * question than the one the spec asked for. More to the point, the seeded
 * draw cache plus a failing backend is the *offline* code path: the path a
 * player on a plane is on, and the one the service worker exists to serve.
 * Exercising it everywhere means the happy path and the degraded path cannot
 * drift apart without a spec noticing.
 *
 * `questions` must satisfy `questionSchema`. They are shaped by hand so the
 * suite has no dependency on `content/questions/*.json`, which changes often
 * and would break assertions for reasons that have nothing to do with the app.
 *
 * One question per bank by default. `QuizFromConvex` picks the opening question
 * at random from the cached draw, so a two-question bank makes half the specs
 * flip between them run to run.
 */

export type SeedQuestion = {
  id: string;
  text: string;
  options: [string, string, string, string];
  answer: string;
  explanation: string;
  source?:
    | { kind: "wikipedia"; title: string; label: string }
    | { kind: "url"; url: string; label: string }
    | { kind: "none" };
};

/** The answer is the last option, so "click the first one" is a wrong answer. */
export const QUESTION: SeedQuestion = {
  id: "con-9001",
  text: "Which field studies systems that perform tasks we associate with human intelligence?",
  options: ["Robotics", "Networking", "Cryptography", "Machine learning"],
  answer: "Machine learning",
  explanation:
    "Machine learning is the subfield of AI concerned with systems that improve from data rather than from hand-written rules.",
  source: { kind: "wikipedia", title: "Machine learning", label: "Wikipedia" },
};

/** Same shape, no verifiable source: the Learn button must not render. */
export const UNSOURCED_QUESTION: SeedQuestion = {
  id: "con-9002",
  text: "Which of these is a model that was never actually published?",
  options: ["GPT-2", "ResNet", "AlexNet", "a fictional model"],
  answer: "a fictional model",
  explanation:
    "This question exists to exercise the branch where a source is missing, so the Learn button stays hidden.",
  source: { kind: "none" },
};

export const SECOND_QUESTION: SeedQuestion = {
  id: "con-9003",
  text: "What is the name of the subfield concerned with training on data?",
  options: ["Machine learning", "Typography", "Cartography", "Etching"],
  answer: "Machine learning",
  explanation: "The other three are not fields of study at all.",
};

export const DEFAULT_BANK: SeedQuestion[] = [QUESTION];

export const CONVEX_URL_GLOB = "**/*";

function question(row: SeedQuestion) {
  return {
    ...row,
    category: "concepts",
    tags: [],
    difficulty: 1200,
    answerAliases: [],
    status: "published",
    addedAt: "2026-01-01",
    source: row.source ?? {
      kind: "wikipedia",
      title: "Artificial intelligence",
      label: "Wikipedia",
    },
  };
}

type Options = {
  questions?: SeedQuestion[];
  answered?: number;
};

/**
 * Seeds localStorage before any page script runs, and cuts Convex off so every
 * query fails.
 *
 * Cutting it off takes two calls, because Convex talks over a WebSocket:
 * `page.route` never sees the sync connection, so an HTTP-only block lets the
 * real deployment answer the draw and quietly replaces the seeded bank with
 * whatever questions are published that minute. The specs would still pass,
 * just about the wrong questions.
 */
export async function seed(page: Page, options: Options = {}): Promise<void> {
  const { questions = DEFAULT_BANK, answered = 0 } = options;

  await page.route(CONVEX_URL_GLOB, async (route) => {
    if (route.request().url().includes("convex")) return route.abort("failed");
    return route.fallback();
  });
  await page.routeWebSocket(/convex/, (socket) => socket.close());

  await page.addInitScript(
    ({ bank, answeredCount }) => {
      window.localStorage.setItem(
        "endless-ai:draw-cache:v1:all",
        JSON.stringify({ questions: bank, at: Date.now() }),
      );
      if (answeredCount > 0) {
        window.localStorage.setItem(
          "endless-ai:progress:v1",
          JSON.stringify({
            rating: 1000,
            answered: answeredCount,
            correct: Math.floor(answeredCount / 2),
            streak: 3,
            lastPlayed: new Date().toISOString(),
            completed: bank.map((q) => q.id),
            recent: [],
          }),
        );
      }
    },
    { bank: questions.map(question), answeredCount: answered },
  );
}

/**
 * Fires a synthetic `beforeinstallprompt` at an app that has already mounted.
 *
 * Chromium only fires the real one after engagement heuristics a test cannot
 * reach, and it fires it inconsistently, so relying on it makes the install
 * specs a coin flip. Dispatching it once, after the quiz is on screen, exercises
 * the same handler and the same deferred-prompt shape every run. The payload
 * is the part the app owns; whether the browser then shows a real dialog is not
 * ours to assert.
 */
export async function offerInstall(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.__installPromptShown = false;
    const event = new Event("beforeinstallprompt", { cancelable: true });
    Object.assign(event, {
      prompt: () => {
        window.__installPromptShown = true;
        return Promise.resolve();
      },
      userChoice: Promise.resolve({ outcome: "accepted" as const }),
    });
    window.dispatchEvent(event);
  });
}

/** Waits out the first paint, which is the quiz or a named degraded frame. */
export async function expectPlaying(page: Page): Promise<void> {
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator("main ul li button")).toHaveCount(4);
}

export const test = base;
export { expect };
