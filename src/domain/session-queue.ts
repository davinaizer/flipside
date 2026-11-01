/**
 * In-session card queue (PRD section 5 Re-queue and Undo, R5, R6, R8, N4).
 *
 * Pure and immutable, so the client and the server can both import it. The
 * queue holds one entry per attempt: a card graded Not yet gets a new entry
 * after REQUEUE_GAP other cards (or at the end when fewer remain), at most
 * REQUEUE_MAX_PER_SESSION times per card. Each grade pushes the previous
 * state onto a history stack so undo restores the exact queue and position,
 * back to the session start.
 */
import { REQUEUE_GAP, REQUEUE_MAX_PER_SESSION } from "../shared/constants";
import type { Grade } from "../shared/enums";

export interface QueueEntry {
  cardId: string;
  /** 1 for the first attempt; 2 and 3 are re-queued attempts. */
  attempt: number;
}

export interface QueueSnapshot {
  entries: readonly QueueEntry[];
  /** Index of the current entry; equals entries.length when the session is finished. */
  position: number;
  /** Times each card has been re-queued in this session. */
  requeues: Readonly<Record<string, number>>;
}

export interface QueueState extends QueueSnapshot {
  /** Previous snapshots, oldest first; the last one is what undo restores. */
  history: readonly QueueSnapshot[];
}

export interface QueueCounts {
  done: number;
  current: number;
  remaining: number;
}

export interface QueueOptions {
  gap?: number;
  maxRequeues?: number;
}

export function startQueue(cardIds: readonly string[]): QueueState {
  return {
    entries: cardIds.map((cardId) => ({ cardId, attempt: 1 })),
    position: 0,
    requeues: {},
    history: [],
  };
}

export function currentEntry(state: QueueSnapshot): QueueEntry | null {
  return state.entries[state.position] ?? null;
}

export function isFinished(state: QueueSnapshot): boolean {
  return state.position >= state.entries.length;
}

export function canUndo(state: QueueState): boolean {
  return state.history.length > 0;
}

export function queueCounts(state: QueueSnapshot): QueueCounts {
  const done = Math.min(state.position, state.entries.length);
  const current = isFinished(state) ? 0 : 1;
  return { done, current, remaining: state.entries.length - done - current };
}

/** Whether a Not yet on the current entry would re-queue it (cap not reached). */
export function wouldRequeue(state: QueueSnapshot, options: QueueOptions = {}): boolean {
  const entry = currentEntry(state);
  if (!entry) return false;
  const max = options.maxRequeues ?? REQUEUE_MAX_PER_SESSION;
  return (state.requeues[entry.cardId] ?? 0) < max;
}

/** Applies a grade to the current entry and moves to the next one. */
export function gradeCurrent(
  state: QueueState,
  grade: Grade,
  options: QueueOptions = {},
): QueueState {
  const entry = currentEntry(state);
  if (!entry) throw new RangeError("session queue is finished; nothing to grade");
  const gap = options.gap ?? REQUEUE_GAP;

  const snapshot: QueueSnapshot = {
    entries: state.entries,
    position: state.position,
    requeues: state.requeues,
  };
  let entries = state.entries;
  let requeues = state.requeues;

  if (grade === "not_yet" && wouldRequeue(state, options)) {
    const count = requeues[entry.cardId] ?? 0;
    const insertAt = Math.min(state.position + 1 + gap, entries.length);
    const next: QueueEntry = { cardId: entry.cardId, attempt: entry.attempt + 1 };
    entries = [...entries.slice(0, insertAt), next, ...entries.slice(insertAt)];
    requeues = { ...requeues, [entry.cardId]: count + 1 };
  }

  return {
    entries,
    position: state.position + 1,
    requeues,
    history: [...state.history, snapshot],
  };
}

/** Restores the state before the latest grade; unchanged at the session start. */
export function undo(state: QueueState): QueueState {
  const previous = state.history.at(-1);
  if (!previous) return state;
  return {
    entries: previous.entries,
    position: previous.position,
    requeues: previous.requeues,
    history: state.history.slice(0, -1),
  };
}
