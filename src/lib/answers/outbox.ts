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
 * only sends another account's events for that account — signing out with
 * pending events parks them until that account signs back in, instead of
 * forging another player's history. Untagged events (no handle was known when
 * recorded) drain under whoever is signed in; the server attributes by auth
 * identity regardless.
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

let syncing = false;

/**
 * Cross-tab sync. Each tab keeps its own snapshot; without this, a second
 * tab's enqueues are invisible to the first until it writes something
 * itself, and its drains iterate a stale list. The writing tab's own drains
 * self-heal most of this, but a `storage` listener is one line per tab and
 * makes every tab's chip and drain current.
 */
export function startOutboxSync(): void {
  if (syncing || typeof window === "undefined") return;
  syncing = true;
  window.addEventListener("storage", (event) => {
    if (event.key !== KEY) return;
    const pending = readOutbox();
    const known = new Set(getOutboxSnapshot().pending.map((e) => e.eventId));
    if (
      pending.length !== getOutboxSnapshot().pending.length ||
      pending.some((e) => !known.has(e.eventId))
    ) {
      set(pending);
    }
  });
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
 * Sends the queue for the given account, head-first per account, and stops at
 * the first failure, leaving the rest — and everything behind it — parked.
 * Returns how many left the device, the server's rating after the last one,
 * and the newest record time sent, so the caller can reconcile the local Elo
 * to truth (see `shouldReconcile` — concurrent drains resolve in any order).
 *
 * Events tagged with another account are skipped, never sent: signing out
 * with pending events parks them until that account signs back in. Events
 * with no tag (`account: null`, recorded before any handle was known) are
 * always sendable — stranding them would be silent permanent loss, and the
 * server attributes by auth identity regardless, so there is no forgery in
 * sending them under whoever is signed in.
 */
export async function drainOutbox(
  send: SendAnswer,
  account: string | null,
): Promise<{ sent: number; lastRating: number | null; maxAt: number | null }> {
  const sent = new Set<string>();
  let lastRating: number | null = null;
  let maxAt: number | null = null;
  for (const event of getOutboxSnapshot().pending) {
    if (event.account !== null && event.account !== account) continue;
    try {
      const result = await send({
        questionId: event.questionId,
        picked: event.picked,
        eventId: event.eventId,
      });
      lastRating = result.ratingAfter;
      maxAt = maxAt === null ? event.at : Math.max(maxAt, event.at);
      sent.add(event.eventId);
    } catch {
      break;
    }
  }
  if (sent.size > 0) dropSent(sent);
  return { sent: sent.size, lastRating, maxAt };
}

/**
 * Guards the Elo reconcile against overlapping drains. Two drains in flight
 * resolve in arbitrary order; without this, an older drain resolving last
 * regresses the local rating and nothing re-triggers to repair it. The
 * newest-sent event wins; ties (`>=`) reconcile, last-writer-wins within a
 * millisecond, which is below the resolution anything here can order by.
 */
let reconciledAt = -1;

export function shouldReconcile(at: number | null): boolean {
  if (at === null || at < reconciledAt) return false;
  reconciledAt = at;
  return true;
}
