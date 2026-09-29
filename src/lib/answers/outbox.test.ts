import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The answer outbox (#17). The drain is the load-bearing piece: it guarantees
 * the server sees events in record order and stops at the first failure, so a
 * broken connection parks the queue instead of scrambling it. The server half
 * (exact `eventId` dedupe, skipping the 5s window for replays) lives in
 * `convex/answers.ts` and cannot be unit-tested from here; it is covered by
 * hand against dev in the PR notes.
 *
 * Module state is fresh per test via `vi.resetModules`, the same trick as
 * `install.test.ts`. `localStorage` is a shared Map so a "reload" is just a
 * re-import.
 */

const storage = new Map<string, string>();

function stubWindow() {
  Object.defineProperty(globalThis, "window", {
    value: {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => void storage.set(key, value),
        removeItem: (key: string) => void storage.delete(key),
      },
    },
    configurable: true,
  });
}

async function load() {
  vi.resetModules();
  stubWindow();
  return import("@/lib/answers/outbox");
}

beforeEach(() => {
  storage.clear();
  vi.unstubAllGlobals();
});

function event(partial: Record<string, unknown> = {}) {
  return {
    eventId: `evt-${Math.random().toString(36).slice(2)}`,
    questionId: "con-9001",
    picked: "Machine learning",
    account: "atlas",
    at: Date.now(),
    ...partial,
  };
}

describe("enqueue / snapshots", () => {
  it("persists events and returns a stable snapshot between changes", async () => {
    const { enqueueAnswer, getOutboxSnapshot } = await load();

    enqueueAnswer(event({ eventId: "e1" }));
    const afterFirst = getOutboxSnapshot();
    expect(afterFirst.pending.map((e) => e.eventId)).toEqual(["e1"]);
    expect(getOutboxSnapshot()).toBe(afterFirst);

    enqueueAnswer(event({ eventId: "e2" }));
    expect(getOutboxSnapshot()).not.toBe(afterFirst);
    expect(getOutboxSnapshot().pending.map((e) => e.eventId)).toEqual(["e1", "e2"]);
  });

  it("survives a reload through localStorage", async () => {
    const first = await load();
    first.enqueueAnswer(event({ eventId: "e1" }));

    const second = await load();
    expect(second.getOutboxSnapshot().pending.map((e) => e.eventId)).toEqual(["e1"]);
  });

  it("drops malformed entries and restores chronological order", async () => {
    storage.set(
      "endless-ai:answer-outbox:v1",
      JSON.stringify([
        event({ eventId: "late", at: 200 }),
        "garbage",
        { questionId: "x" },
        event({ eventId: "early", at: 100 }),
        event({ eventId: "no-clock", at: undefined }),
      ]),
    );

    const { getOutboxSnapshot } = await load();
    expect(getOutboxSnapshot().pending.map((e) => e.eventId)).toEqual([
      "no-clock",
      "early",
      "late",
    ]);
  });

  it("caps the queue instead of growing localStorage without bound", async () => {
    const { enqueueAnswer, getOutboxSnapshot } = await load();
    for (let i = 0; i < 1005; i++) {
      enqueueAnswer(event({ eventId: `e${i}`, at: i }));
    }
    const pending = getOutboxSnapshot().pending;
    expect(pending).toHaveLength(1000);
    expect(pending[0]!.eventId).toBe("e5");
    expect(pending[999]!.eventId).toBe("e1004");
  });
});

describe("drainOutbox", () => {
  it("sends head-first for the account and reports the last rating", async () => {
    const { drainOutbox, enqueueAnswer } = await load();
    enqueueAnswer(event({ eventId: "e1", at: 1 }));
    enqueueAnswer(event({ eventId: "e2", at: 2 }));
    enqueueAnswer(event({ eventId: "e3", at: 3 }));

    const sent: string[] = [];
    const result = await drainOutbox(async (args) => {
      sent.push(args.eventId);
      return { ratingAfter: 1000 + sent.length * 10 };
    }, "atlas");

    expect(sent).toEqual(["e1", "e2", "e3"]);
    expect(result).toEqual({ sent: 3, lastRating: 1030, maxAt: 3 });

    const { getOutboxSnapshot } = await load();
    expect(getOutboxSnapshot().pending).toEqual([]);
  });

  it("leaves other accounts parked and keeps sending ours behind them", async () => {
    const { drainOutbox, enqueueAnswer } = await load();
    enqueueAnswer(event({ eventId: "theirs", account: "bruno", at: 1 }));
    enqueueAnswer(event({ eventId: "ours", account: "atlas", at: 2 }));

    const sent: string[] = [];
    const result = await drainOutbox(async (args) => {
      sent.push(args.eventId);
      return { ratingAfter: 1000 };
    }, "atlas");

    expect(sent).toEqual(["ours"]);
    expect(result).toEqual({ sent: 1, lastRating: 1000, maxAt: 2 });

    const { getOutboxSnapshot } = await load();
    expect(getOutboxSnapshot().pending.map((e) => e.eventId)).toEqual(["theirs"]);
  });

  it("sends untagged events under whoever is draining", async () => {
    const { drainOutbox, enqueueAnswer } = await load();
    enqueueAnswer(event({ eventId: "untagged", account: null, at: 1 }));
    enqueueAnswer(event({ eventId: "theirs", account: "bruno", at: 2 }));

    const sent: string[] = [];
    const result = await drainOutbox(async (args) => {
      sent.push(args.eventId);
      return { ratingAfter: 1000 };
    }, "atlas");

    // The untagged event drains; the other account's stays parked. Stranding
    // the untagged ones was a silent permanent loss (review on #43).
    expect(sent).toEqual(["untagged"]);
    expect(result.sent).toBe(1);

    const { getOutboxSnapshot } = await load();
    expect(getOutboxSnapshot().pending.map((e) => e.eventId)).toEqual(["theirs"]);
  });

  it("stops at the first failure and keeps everything from there on", async () => {
    const { drainOutbox, enqueueAnswer } = await load();
    enqueueAnswer(event({ eventId: "e1", at: 1 }));
    enqueueAnswer(event({ eventId: "e2", at: 2 }));
    enqueueAnswer(event({ eventId: "e3", at: 3 }));

    const sent: string[] = [];
    const result = await drainOutbox(async (args) => {
      if (args.eventId === "e2") throw new Error("offline");
      sent.push(args.eventId);
      return { ratingAfter: 1000 };
    }, "atlas");

    expect(sent).toEqual(["e1"]);
    expect(result).toEqual({ sent: 1, lastRating: 1000, maxAt: 1 });

    const { getOutboxSnapshot } = await load();
    expect(getOutboxSnapshot().pending.map((e) => e.eventId)).toEqual(["e2", "e3"]);
  });

  it("treats a deduped server reply as delivered, not as a retry", async () => {
    const { drainOutbox, enqueueAnswer } = await load();
    enqueueAnswer(event({ eventId: "e1", at: 1 }));

    const result = await drainOutbox(async () => ({ ratingAfter: 999 }), "atlas");

    expect(result).toEqual({ sent: 1, lastRating: 999, maxAt: expect.any(Number) });
    const { getOutboxSnapshot } = await load();
    expect(getOutboxSnapshot().pending).toEqual([]);
  });
});

describe("shouldReconcile", () => {
  it("lets the newest-sent event win across overlapping drains", async () => {
    const { drainOutbox, enqueueAnswer, shouldReconcile } = await load();
    enqueueAnswer(event({ eventId: "e1", at: 100 }));

    // The first drain starts while only e1 exists; its send hangs. A second
    // answer lands, a second drain sends both and resolves first, then the
    // older drain's e1 resolves. Without the guard the local rating would
    // regress to the older result and stay there, since nothing re-triggers.
    let releaseFirst: (() => void) | null = null;
    const gate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const first = drainOutbox(async () => {
      await gate;
      return { ratingAfter: 1010 };
    }, "atlas");

    enqueueAnswer(event({ eventId: "e2", at: 200 }));
    const second = await drainOutbox(async () => ({ ratingAfter: 1020 }), "atlas");
    releaseFirst!();
    const firstResult = await first;

    expect(second).toMatchObject({ sent: 2, lastRating: 1020, maxAt: 200 });
    expect(firstResult).toMatchObject({ sent: 1, lastRating: 1010, maxAt: 100 });

    const applied: number[] = [];
    if (shouldReconcile(second.maxAt)) applied.push(second.lastRating!);
    if (shouldReconcile(firstResult.maxAt)) applied.push(firstResult.lastRating!);
    expect(applied).toEqual([1020]);
  });

  it("reconciles ties last-writer-wins", async () => {
    const { shouldReconcile } = await load();
    expect(shouldReconcile(100)).toBe(true);
    expect(shouldReconcile(100)).toBe(true);
    expect(shouldReconcile(99)).toBe(false);
  });
});
