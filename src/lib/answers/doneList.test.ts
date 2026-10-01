import { describe, expect, it } from "vitest";

import { buildDoneList, DONE_LIMIT } from "@/lib/answers/doneList";

/**
 * The done list's two decisions: one ordered run rather than two blocks, and a
 * hard cap. Both apps call this, so a change here is a change on both — which is
 * the point, and also why the cap is a named constant rather than a literal in
 * two views.
 */
describe("buildDoneList", () => {
  it("puts the most recent question first", () => {
    const list = buildDoneList({
      completedIds: ["a", "b"],
      attempts: [
        { id: "a", correct: true },
        { id: "b", correct: false },
        { id: "c", correct: true },
      ],
    });
    expect(list.map((e) => e.id)).toEqual(["c", "b", "a"]);
    expect(list.map((e) => e.correct)).toEqual([true, false, true]);
  });

  it("interleaves misses and corrects in answer order", () => {
    // The web used to render all misses then all corrects, which is two lists.
    const list = buildDoneList({
      completedIds: [],
      attempts: [
        { id: "q1", correct: true },
        { id: "q2", correct: false },
        { id: "q3", correct: true },
        { id: "q4", correct: false },
      ],
    });
    expect(list.map((e) => e.correct)).toEqual([false, true, false, true]);
    expect(list.map((e) => e.id)).toEqual(["q4", "q3", "q2", "q1"]);
  });

  it("keeps the most recent verdict, so a later correct clears a miss", () => {
    const list = buildDoneList({
      completedIds: ["q1"],
      attempts: [
        { id: "q1", correct: false },
        { id: "q1", correct: true },
      ],
    });
    expect(list).toEqual([{ id: "q1", correct: true }]);
  });

  it("does not list a question twice", () => {
    const list = buildDoneList({
      completedIds: ["q1", "q2"],
      attempts: [
        { id: "q1", correct: true },
        { id: "q2", correct: false },
      ],
    });
    expect(list.map((e) => e.id)).toEqual(["q2", "q1"]);
  });

  it("appends done-list ids the attempt stream has rolled off", () => {
    // The recent ring is capped, so the completed list is often longer. Those
    // ids have no verdict in the stream, and the completed list only ever holds
    // correct answers, so they go on the end as correct.
    const list = buildDoneList({
      completedIds: ["old1", "old2", "q1"],
      attempts: [{ id: "q1", correct: false }],
    });
    expect(list.map((e) => e.id)).toEqual(["q1", "old2", "old1"]);
    expect(list.map((e) => e.correct)).toEqual([false, true, true]);
  });

  it("caps the list, and the cap is shared", () => {
    const attempts = Array.from({ length: 400 }, (_, i) => ({
      id: `con-${String(i).padStart(4, "0")}`,
      correct: i % 3 !== 0,
    }));
    const list = buildDoneList({ completedIds: [], attempts });
    expect(DONE_LIMIT).toBe(50);
    expect(list).toHaveLength(50);
    // The cap keeps the newest, not the oldest.
    expect(list[0]!.id).toBe("con-0399");
    expect(list.at(-1)!.id).toBe("con-0350");
  });

  it("is empty for a player who has not answered anything", () => {
    expect(buildDoneList({ completedIds: [], attempts: [] })).toEqual([]);
  });
});
