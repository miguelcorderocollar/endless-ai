/**
 * The storage-agnostic half of the answer-event outbox (#17), shared by the
 * web app and the native app (#18).
 *
 * Why the split: the rules that make the outbox correct are not about storage.
 * They are that every send carries an `eventId` the server can dedupe on, that
 * events drain in record order, that the drain stops at the first failure so
 * nothing behind it is skipped, and that events tagged with another account are
 * never sent under this one. Those four are what `convex/answers.ts` relies on,
 * and reimplementing them in `apps/mobile` would have been a second place to get
 * them wrong. They live here, and the two adapters (`outbox.ts` for
 * localStorage, `apps/mobile/src/lib/outbox.ts` for AsyncStorage) only decide
 * where the list is kept and when to notify.
 *
 * Everything in this module is pure and synchronous except `runDrain`, which
 * awaits the transport. That is deliberate: it makes the whole thing testable
 * without a DOM, an emulator, or a WebSocket.
 */

/** Cap: hours of offline play. Bounded because a phone's storage is not free. */
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

export type OutboxState = { pending: readonly QueuedAnswer[] };

export const EMPTY_OUTBOX: OutboxState = { pending: [] };

export type SendAnswer = (args: {
  questionId: string;
  picked: string;
  eventId: string;
}) => Promise<{ ratingAfter: number }>;

export type DrainResult = {
  sent: number;
  lastRating: number | null;
  maxAt: number | null;
};

/**
 * Anything that can be an id. Guessing a wrong one here is what turns a
 * half-written storage value into a silent loss, so the three identity fields
 * are required and coerced into exactly their declared types.
 */
export function sanitizeQueue(list: unknown): QueuedAnswer[] {
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

/** Appends one event, dropping the oldest past the cap. */
export function appendQueued(
  pending: readonly QueuedAnswer[],
  event: QueuedAnswer,
): QueuedAnswer[] {
  return [...pending, event].slice(-OUTBOX_CAP);
}

/**
 * The events this account is allowed to send, in record order. Events tagged
 * with another account are skipped, never sent: signing out with pending events
 * parks them until that account signs back in, instead of forging another
 * player's history. Events with no tag (`account: null`, recorded before any
 * handle was known) are always sendable — stranding them would be silent
 * permanent loss, and the server attributes by auth identity regardless, so
 * there is no forgery in sending them under whoever is signed in.
 */
export function sendableEvents(
  pending: readonly QueuedAnswer[],
  account: string | null,
): QueuedAnswer[] {
  return pending.filter(
    (event) => event.account === null || event.account === account,
  );
}

export function withoutSent(
  pending: readonly QueuedAnswer[],
  sent: ReadonlySet<string>,
): QueuedAnswer[] {
  return pending.filter((event) => !sent.has(event.eventId));
}

/**
 * Sends the queue for the given account, head-first, and stops at the first
 * failure, leaving the rest — and everything behind it — parked.
 *
 * The caller applies `withoutSent` with the returned ids and persists, so this
 * stays free of both storage and subscriptions.
 *
 * `lastRating` and `maxAt` exist so the caller can reconcile the local Elo to
 * truth (see `shouldReconcile` — concurrent drains resolve in any order).
 */
export async function runDrain(
  pending: readonly QueuedAnswer[],
  send: SendAnswer,
  account: string | null,
): Promise<DrainResult & { sentIds: Set<string> }> {
  const sentIds = new Set<string>();
  let lastRating: number | null = null;
  let maxAt: number | null = null;
  for (const event of sendableEvents(pending, account)) {
    try {
      const result = await send({
        questionId: event.questionId,
        picked: event.picked,
        eventId: event.eventId,
      });
      lastRating = result.ratingAfter;
      maxAt = maxAt === null ? event.at : Math.max(maxAt, event.at);
      sentIds.add(event.eventId);
    } catch {
      break;
    }
  }
  return { sent: sentIds.size, lastRating, maxAt, sentIds };
}

/**
 * Guards the Elo reconcile against overlapping drains. Two drains in flight
 * resolve in arbitrary order; without this, an older drain resolving last
 * regresses the local rating and nothing re-triggers to repair it. The
 * newest-sent event wins; ties (`>=`) reconcile, last-writer-wins within a
 * millisecond, which is below the resolution anything here can order by.
 *
 * Module state on purpose: the guard is about two concurrent callers in one
 * process, and both apps are one process.
 */
let reconciledAt = -1;

export function shouldReconcile(at: number | null): boolean {
  if (at === null || at < reconciledAt) return false;
  reconciledAt = at;
  return true;
}
