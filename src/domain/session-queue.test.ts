import { describe, expect, it } from "vitest";
import fixtures from "../../fixtures/domain/session-queue.json";
import { REQUEUE_GAP, REQUEUE_MAX_PER_SESSION } from "../shared/constants";
import { GRADES, type Grade } from "../shared/enums";
import {
  canUndo,
  currentEntry,
  gradeCurrent,
  hasAttemptLeft,
  isFinished,
  queueCounts,
  replayQueue,
  startQueue,
  undo,
  type QueueState,
} from "./session-queue";

interface Expect {
  queue: string[];
  attempts: number[];
  position: number;
  current: string | null;
  counts: { done: number; current: number; remaining: number };
  requeues: Record<string, number>;
  canUndo: boolean;
}

function describeState(state: QueueState): Expect {
  return {
    queue: state.entries.map((e) => e.cardId),
    attempts: state.entries.map((e) => e.attempt),
    position: state.position,
    current: currentEntry(state)?.cardId ?? null,
    counts: queueCounts(state),
    requeues: { ...state.requeues },
    canUndo: canUndo(state),
  };
}

function apply(state: QueueState, action: string): QueueState {
  return action === "undo" ? undo(state) : gradeCurrent(state, action as Grade);
}

describe("session queue fixtures", () => {
  it("fixture constants match shared constants", () => {
    expect(fixtures.gap).toBe(REQUEUE_GAP);
    expect(fixtures.maxRequeues).toBe(REQUEUE_MAX_PER_SESSION);
  });

  it.each(fixtures.cases)("$name", (c) => {
    let state = startQueue(c.cardIds);
    if ("start" in c) expect(describeState(state)).toEqual(c.start);
    for (const step of c.steps) {
      state = apply(state, step.action);
      expect(describeState(state)).toEqual(step.expect);
    }
  });
});

describe("replay", () => {
  const g = (cardId: string, grade: Grade) => ({ cardId, grade });

  it("rebuilds the same queue as grading live, including re-queues and the cap", () => {
    const grades = [g("a", "not_yet"), g("b", "got_it"), g("a", "not_yet"), g("a", "not_yet")];
    let live = startQueue(["a", "b"]);
    for (const x of grades) live = gradeCurrent(live, x.grade);
    const { queue, applied } = replayQueue(["a", "b"], grades);
    expect(queue).toEqual(live);
    expect(applied).toEqual(grades);
    expect(isFinished(queue)).toBe(true);
  });

  it("skips a grade for a card that is not current at its turn, and keeps the rest", () => {
    const { queue, applied } = replayQueue(["a", "b", "c"], [g("a", "got_it"), g("c", "got_it"), g("b", "nearly")]);
    expect(applied.map((x) => x.cardId)).toEqual(["a", "b"]);
    expect(currentEntry(queue)?.cardId).toBe("c");
  });

  it("a card deleted mid-session drops out: its grades are skipped and the rest can finish", () => {
    // "b" was graded Not yet, then deleted; replay runs over the live cards only.
    const { queue } = replayQueue(["a", "c"], [g("a", "got_it"), g("b", "not_yet"), g("c", "got_it")]);
    expect(isFinished(queue)).toBe(true);
    expect(queue.entries.map((e) => e.cardId)).toEqual(["a", "c"]);
  });

  it("knows whether a card still has an attempt ahead", () => {
    const { queue } = replayQueue(["a", "b"], [g("a", "not_yet")]);
    expect(hasAttemptLeft(queue, "a")).toBe(true);
    const done = replayQueue(["a", "b"], [g("a", "got_it")]).queue;
    expect(hasAttemptLeft(done, "a")).toBe(false);
    expect(hasAttemptLeft(done, "b")).toBe(true);
  });
});

function seeded(seed: number): () => number {
  // mulberry32
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32;
  };
}

describe("session queue invariants", () => {
  for (let seed = 1; seed <= 40; seed++) {
    it(`random session ${seed}: re-queue rules, counts and undo to start`, () => {
      const random = seeded(seed);
      const size = 1 + Math.floor(random() * 12);
      const ids = Array.from({ length: size }, (_, i) => `c${i}`);
      const start = startQueue(ids);
      const states: QueueState[] = [start];
      let state = start;

      while (!isFinished(state)) {
        const grade = GRADES[Math.floor(random() * GRADES.length)]!;
        const before = state;
        const graded = currentEntry(before)!;
        state = gradeCurrent(state, grade);
        states.push(state);

        const counts = queueCounts(state);
        expect(counts.done).toBe(state.position);
        expect(counts.done + counts.current + counts.remaining).toBe(state.entries.length);

        const added = state.entries.length - before.entries.length;
        const priorRequeues = before.requeues[graded.cardId] ?? 0;
        if (grade === "not_yet" && priorRequeues < REQUEUE_MAX_PER_SESSION) {
          expect(added).toBe(1);
          const remainingAfter = before.entries.length - before.position - 1;
          const idx = state.entries.findIndex(
            (e, i) => i > before.position && e.cardId === graded.cardId && e.attempt === graded.attempt + 1,
          );
          const between = idx - before.position - 1;
          expect(between).toBe(Math.min(REQUEUE_GAP, remainingAfter));
          if (remainingAfter < REQUEUE_GAP) expect(idx).toBe(state.entries.length - 1);
        } else {
          expect(added).toBe(0);
        }
      }

      for (const id of ids) {
        const n = state.entries.filter((e) => e.cardId === id).length;
        expect(n).toBeLessThanOrEqual(1 + REQUEUE_MAX_PER_SESSION);
      }
      expect(queueCounts(state)).toEqual({ done: state.entries.length, current: 0, remaining: 0 });

      // Undo walks back through every exact previous state.
      for (let i = states.length - 2; i >= 0; i--) {
        state = undo(state);
        expect(state).toEqual(states[i]);
      }
      expect(canUndo(state)).toBe(false);
      expect(undo(state)).toBe(state);
    });
  }

  it("does not mutate the input state", () => {
    const start = startQueue(["a", "b", "c", "d", "e", "f"]);
    const frozen = structuredClone(start);
    const next = gradeCurrent(start, "not_yet");
    expect(start).toEqual(frozen);
    undo(next);
    expect(start).toEqual(frozen);
  });

  it("empty queue is finished with zero counts", () => {
    const q = startQueue([]);
    expect(isFinished(q)).toBe(true);
    expect(currentEntry(q)).toBeNull();
    expect(queueCounts(q)).toEqual({ done: 0, current: 0, remaining: 0 });
  });

  it("grading a finished queue throws", () => {
    const q = gradeCurrent(startQueue(["a"]), "got_it");
    expect(() => gradeCurrent(q, "got_it")).toThrow(RangeError);
  });

  it("honours gap and cap options", () => {
    let q = startQueue(["a", "b", "c", "d"]);
    q = gradeCurrent(q, "not_yet", { gap: 1, maxRequeues: 1 });
    expect(q.entries.map((e) => e.cardId)).toEqual(["a", "b", "a", "c", "d"]);
    q = gradeCurrent(q, "got_it");
    q = gradeCurrent(q, "not_yet", { gap: 1, maxRequeues: 1 });
    expect(q.entries).toHaveLength(5);
  });
});
