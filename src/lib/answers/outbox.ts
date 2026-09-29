/**
 * The answer-event outbox (#17): every signed-in answer is queued first and
 * the queue drains first-in-first-out, so the server always sees events in the
 * order the player made them.
 *
 * Why the queue sits in front of even the live path: a mutation that fails is
 * indistinguishable from one whose *response* was lost. Sending "just try it
 * and queue on failure" would insert a duplicate for the second case. Always
 * enqueue-then-drain means every send carries its `eventId`, and the server's
 * exact lookup (`by_user_event`) turns the ambiguous case into a no-op. The
 * 5s network-retry window in `answers.answer` is skipped for these, because a
 * player who answered the same question twice while offline would otherwise
 * lose the second attempt on replay.
 *
 * Guests never enqueue: there is no account for the server to attribute the
 * events to, and a later sign-in deliberately does not backfill them. Queued
 * events carry the signed-in handle they were recorded under, and the drain
 * only sends events for the current account — signing out with pending events
 * parks them until that account signs back in, instead of forging another
 * player's history.
 */

const KEY = "endless-ai:answer-outbox:v1";

/** Cap: hours of offline play. Bounded because localStorage is not. */
export const OUTBOX_CAP = 1000;

export type QueuedAnswer = {
  /** Client UUID. Survives retries; the server treats it as the dedupe key. */
  eventId: string;
  questionId: string;
  picked: string;
  /** Signed-in handle at record time, or null. Attribution guard on drain. */
  account: string | null;
  /** Client clock at record time. Drain order, not server truth. */
  at: number;
};

export function newEventId(): string {
  const cryptoApi = globalThis.crypto as Crypto | undefined;
  if (cryptoApi && typeof cryptoApi.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.floor(Math.random() * 2 ** 32).toString(36)}`;
}

function sanitize(list: unknown): QueuedAnswer[] {
  if (!Array.isArray(list)) return [];
  const out: QueuedAnswer[] = [];
  for (const entry of list) {
    if (typeof entry !== "object" || entry === null) continue;
    const e = entry as Record<string, unknown>;
    if (
      typeof e.eventId !== "string" ||
      e.eventId.length === 0 ||
      typeof e.questionId !== "string" ||
      e.questionId.length === 0 ||
      typeof e.picked !== "string" ||
      e.picked.length === 0
    ) {
      continue;
    }
    out.push({
      eventId: e.eventId,
      questionId: e.questionId,
      picked: e.picked,
      account:
        typeof e.account === "string" && e.account.length > 0 ? e.account : null,
      at: typeof e.at === "number" ? e.at : 0,
    });
  }
  // Chronological drain. Entries without a clock sort first; they predate any
  // clocked ones only by being unreadable, so this loses nothing.
  out.sort((a, b) => a.at - b.at);
  return out.slice(-OUTBOX_CAP);
}

function readOutbox(): QueuedAnswer[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    return sanitize(JSON.parse(raw));
  } catch {
    return [];
  }
}

function writeOutbox(pending: QueuedAnswer[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(pending));
  } catch {
    /* private browsing, quota. The answers still painted locally. */
  }
}

type OutboxState = { pending: readonly QueuedAnswer[] };

const EMPTY: OutboxState = { pending: [] };

let current: OutboxState = EMPTY;

const listeners = new Set<() => void>();

function set(pending: readonly QueuedAnswer[]) {
  current = { pending };
  writeOutbox([...pending]);
  for (const listener of listeners) listener();
}

export function subscribeOutbox(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getOutboxSnapshot(): OutboxState {
  if (typeof window !== "undefined" && current === EMPTY) {
    // Lazy-read localStorage on first render (#31), same as progress.ts: no
    // notify, because the render that triggered this read already holds the
    // fresh value and there is nothing to catch up on.
    const pending = readOutbox();
    if (pending.length > 0) {
      current = { pending };
    }
  }
  return current;
}

export function getOutboxServerSnapshot(): OutboxState {
  return EMPTY;
}

export function enqueueAnswer(event: QueuedAnswer): void {
  const pending = [...getOutboxSnapshot().pending, event];
  set(pending.slice(-OUTBOX_CAP));
}

function dropSent(ids: Set<string>): void {
  const pending = getOutboxSnapshot().pending.filter((e) => !ids.has(e.eventId));
  if (pending.length !== getOutboxSnapshot().pending.length) set(pending);
}

export type SendAnswer = (args: {
  questionId: string;
  picked: string;
  eventId: string;
}) => Promise<{ ratingAfter: number }>;

/**
 * Sends the queue head-first for the given account and stops at the first
 * failure, leaving the rest — and everything behind it — parked. Returns how
 * many left the device and the server's rating after the last one, so the
 * caller can reconcile the local Elo to truth.
 */
export async function drainOutbox(
  send: SendAnswer,
  account: string | null,
): Promise<{ sent: number; lastRating: number | null }> {
  const sent = new Set<string>();
  let lastRating: number | null = null;
  for (const event of getOutboxSnapshot().pending) {
    if (event.account !== account) continue;
    try {
      const result = await send({
        questionId: event.questionId,
        picked: event.picked,
        eventId: event.eventId,
      });
      lastRating = result.ratingAfter;
      sent.add(event.eventId);
    } catch {
      break;
    }
  }
  if (sent.size > 0) dropSent(sent);
  return { sent: sent.size, lastRating };
}
