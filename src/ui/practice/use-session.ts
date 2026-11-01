"use client";

import { useState, useSyncExternalStore } from "react";
import {
  canUndo,
  currentEntry,
  gradeCurrent,
  isFinished,
  queueCounts,
  startQueue,
  undo as undoQueue,
  type QueueState,
} from "@/domain/session-queue";
import type { Grade } from "@/shared/enums";
import type { SessionCardPayload, SessionResponse } from "@/shared/schemas/session";
import { api } from "@/ui/api/client";
import { uuidv7 } from "@/shared/uuid";

type Labels = Record<Grade, string>;

/** The slice of the API the controller needs, so tests can fake it. */
export interface SessionApi {
  grade(reviewId: string, body: { sessionId: string; cardId: string; grade: Grade; durationMs: number }): Promise<{ requeue: boolean; labels: Labels | null }>;
  undo(reviewId: string): Promise<{ labels: Labels }>;
  end(sessionId: string): Promise<unknown>;
}

export interface SessionView {
  card: SessionCardPayload | null;
  labels: Labels | null;
  revealed: boolean;
  done: number;
  total: number;
  canUndo: boolean;
  busy: boolean;
  /** A grade that failed to save; "Try again" resends it under the same review id. */
  failed: boolean;
  finished: boolean;
}

/** A grade waiting for the server. Kept after a failure so the retry reuses the id (N2) and the duration. */
interface Pending {
  reviewId: string;
  cardId: string;
  grade: Grade;
  durationMs: number;
}

/**
 * Practice session logic without React: the client queue (domain/session-queue), the review ids
 * that undo needs, and the silent per-card timer (R12). The queue is rebuilt on load by replaying
 * the grades the server returns, so a reload resumes at the same card. Nothing is applied locally
 * until the server accepts the write, so the screen never shows a state the server lacks.
 */
export function createSessionController(
  data: SessionResponse,
  deps: { api: SessionApi; now: () => number; onLeave: () => void },
) {
  const cards = new Map(data.queue.map((c) => [c.cardId, c]));
  const labelOverrides = new Map<string, Labels>();
  let queue: QueueState = startQueue(data.queue.map((c) => c.cardId));
  const reviewIds: string[] = []; // parallel to queue.history
  for (const g of data.grades) {
    if (isFinished(queue) || currentEntry(queue)?.cardId !== g.cardId) continue;
    queue = gradeCurrent(queue, g.grade);
    reviewIds.push(g.reviewId);
  }
  let revealed = false;
  let shownAt = deps.now();
  let busy = false;
  let pending: Pending | null = null;
  const listeners = new Set<() => void>();
  let view = compute();

  function compute(): SessionView {
    const entry = currentEntry(queue);
    const card = entry ? (cards.get(entry.cardId) ?? null) : null;
    const counts = queueCounts(queue);
    return {
      card,
      labels: card ? (labelOverrides.get(card.cardId) ?? card.labels) : null,
      revealed,
      done: counts.done,
      total: queue.entries.length,
      canUndo: canUndo(queue),
      busy,
      failed: pending !== null && !busy,
      finished: isFinished(queue),
    };
  }
  function emit() {
    view = compute();
    listeners.forEach((l) => l());
  }
  function showFront() {
    revealed = false;
    shownAt = deps.now();
  }

  async function send(p: Pending) {
    busy = true;
    emit();
    try {
      const res = await deps.api.grade(p.reviewId, { sessionId: data.session.id, cardId: p.cardId, grade: p.grade, durationMs: p.durationMs });
      queue = gradeCurrent(queue, p.grade);
      reviewIds.push(p.reviewId);
      if (res.requeue && res.labels) labelOverrides.set(p.cardId, res.labels);
      pending = null;
      showFront();
    } catch {
      // keep `pending` so retry() sends the same review id
    }
    busy = false;
    emit();
  }

  return {
    getView: () => view,
    subscribe(l: () => void) {
      listeners.add(l);
      return () => void listeners.delete(l);
    },
    reveal() {
      revealed = true;
      emit();
    },
    /** Duration runs from the front being shown to this call; it is sent, never displayed. */
    grade(grade: Grade) {
      const entry = currentEntry(queue);
      if (busy || pending || !entry || !revealed) return Promise.resolve();
      pending = { reviewId: uuidv7(), cardId: entry.cardId, grade, durationMs: Math.max(0, Math.round(deps.now() - shownAt)) };
      return send(pending);
    },
    retry() {
      return pending && !busy ? send(pending) : Promise.resolve();
    },
    async undo() {
      const id = reviewIds.at(-1);
      if (busy || pending || !id) return;
      busy = true;
      emit();
      try {
        const res = await deps.api.undo(id);
        const cardId = queue.entries[queue.history.at(-1)!.position]!.cardId;
        queue = undoQueue(queue);
        reviewIds.pop();
        labelOverrides.set(cardId, res.labels);
        showFront();
      } catch {
        // nothing changed on the server or here; the button can be pressed again
      }
      busy = false;
      emit();
    },
    /** Leaves at once; the server call is not waited for and grades already given are kept. */
    end() {
      void deps.api.end(data.session.id).catch(() => {});
      deps.onLeave();
    },
  };
}

export const sessionApi: SessionApi = {
  grade: (id, body) => api.grade(id, body),
  undo: (id) => api.undoGrade(id),
  end: (id) => api.endSession(id),
};

const clock = () => performance.now();

export function useSession(data: SessionResponse, onLeave: () => void) {
  // The controller owns the session from first load; a new load of the same session is a new mount.
  const [controller] = useState(() => createSessionController(data, { api: sessionApi, now: clock, onLeave }));
  const view = useSyncExternalStore(controller.subscribe, controller.getView, controller.getView);
  return { view, controller };
}
