import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import type { SessionResponse } from "@/shared/schemas/session";
import { GradeBar } from "./GradeBar";
import { ApiClientError } from "@/ui/api/client";
import { createSessionController, type SessionApi } from "./use-session";

const ids = ["a", "b", "c"].map((x) => `00000000-0000-4000-8000-00000000000${x.charCodeAt(0) - 96}`);
const labels = { not_yet: "Again today", nearly: "Tomorrow", got_it: "In 3 days" };
const card = (cardId: string) => ({
  cardId, deckId: "d", deckName: "Bio", answerStyle: "bullets" as const, topic: "T",
  front: `Q ${cardId.slice(-1)}`, back: "A", frontImage: null, backImage: null, labels,
});
const data = (grades: SessionResponse["grades"] = []): SessionResponse => ({
  session: { id: "s", scope: { kind: "all" }, length: 5, plannedCount: 3, startedAt: "", endedAt: null, endedReason: null },
  queue: ids.map(card),
  grades,
});

function setup(d = data()) {
  let t = 1000;
  const calls: { id: string; body: { durationMs: number; grade: string } }[] = [];
  const fresh = { not_yet: "Fresh again", nearly: "Fresh 2", got_it: "Fresh 3" };
  const api: SessionApi = {
    grade: vi.fn(async (id, body) => {
      calls.push({ id, body });
      return { requeue: body.grade === "not_yet", labels: body.grade === "not_yet" ? fresh : null };
    }),
    undo: vi.fn(async () => ({ labels })),
    end: vi.fn(async () => ({})),
    load: vi.fn(async () => d),
  };
  const onLeave = vi.fn();
  const c = createSessionController(d, { api, now: () => t, onLeave });
  return { c, api, calls, onLeave, advance: (ms: number) => (t += ms), fresh };
}

test("three buttons with icon, label and server sublabel", () => {
  const html = renderToStaticMarkup(createElement(GradeBar, { labels, busy: false, failed: false, onGrade: () => {}, onRetry: () => {} }));
  for (const s of ["Not yet", "Nearly", "Got it", "Again today", "Tomorrow", "In 3 days"]) expect(html).toContain(s);
  expect(html.match(/<svg/g)).toHaveLength(3);
});

test("Not yet re-queues the card with fresh labels", async () => {
  const { c, fresh } = setup();
  c.reveal();
  await c.grade("not_yet");
  expect(c.getView().card?.cardId).toBe(ids[1]);
  await (c.reveal(), c.grade("got_it"));
  await (c.reveal(), c.grade("got_it")); // gap 3 > remaining: re-queued card is last
  expect(c.getView().card?.cardId).toBe(ids[0]);
  expect(c.getView().labels).toEqual(fresh);
  expect(c.getView().total).toBe(4);
});

test("duration runs from the front shown to the grade, not from the reveal", async () => {
  const { c, calls, advance } = setup();
  advance(4000);
  c.reveal();
  advance(1500);
  await c.grade("got_it");
  expect(calls[0]!.body.durationMs).toBe(5500);
  advance(300);
  c.reveal();
  await c.grade("nearly");
  expect(calls[1]!.body.durationMs).toBe(300);
});

test("Undo last returns to the previous front, repeatedly, to the start", async () => {
  const { c, api } = setup();
  for (let i = 0; i < 2; i++) await (c.reveal(), c.grade("got_it"));
  expect(c.getView().card?.cardId).toBe(ids[2]);
  await c.undo();
  expect(c.getView()).toMatchObject({ revealed: false, canUndo: true });
  expect(c.getView().card?.cardId).toBe(ids[1]);
  await c.undo();
  expect(c.getView().card?.cardId).toBe(ids[0]);
  expect(c.getView().canUndo).toBe(false);
  await c.undo();
  expect(api.undo).toHaveBeenCalledTimes(2);
});

test("End session leaves at once and does not wait for the server", () => {
  const { c, onLeave, api } = setup();
  c.end();
  expect(onLeave).toHaveBeenCalledOnce();
  expect(api.end).toHaveBeenCalledWith("s");
});

test("a failed grade retries with the same review id and duration", async () => {
  const { c, api, calls, advance } = setup();
  vi.mocked(api.grade).mockRejectedValueOnce(new Error("offline"));
  advance(2000);
  c.reveal();
  await c.grade("nearly");
  expect(c.getView()).toMatchObject({ failed: true, done: 0 });
  advance(9000);
  await c.retry();
  expect(c.getView()).toMatchObject({ failed: false, done: 1 });
  expect(vi.mocked(api.grade).mock.calls[0]![0]).toBe(calls[0]!.id);
  expect(calls[0]!.body.durationMs).toBe(2000);
});

test("reloading replays the grades and resumes at the same card", () => {
  const g = (i: number, grade: "got_it" | "not_yet") => ({ reviewId: `r${i}`, cardId: ids[i]!, grade, reviewedAt: "" });
  const { c } = setup(data([g(0, "got_it"), g(1, "not_yet")]));
  expect(c.getView().card?.cardId).toBe(ids[2]);
  expect(c.getView()).toMatchObject({ done: 2, total: 4, canUndo: true });
});

test("a grade refused because the queue is out of date reloads the session and carries on", async () => {
  const { c, api } = setup();
  // Elsewhere, the first card was graded and the second deleted; the server now expects the third.
  const g = { reviewId: "r0", cardId: ids[0]!, grade: "got_it" as const, reviewedAt: "" };
  vi.mocked(api.load).mockResolvedValueOnce({ ...data([g]), queue: [card(ids[0]!), card(ids[2]!)] });
  vi.mocked(api.grade).mockRejectedValueOnce(new ApiClientError(409, "not_current_card", "stale"));
  c.reveal();
  await c.grade("nearly");
  expect(api.load).toHaveBeenCalledWith("s");
  expect(c.getView()).toMatchObject({ failed: false, revealed: false, done: 1, total: 2, canUndo: true });
  expect(c.getView().card?.cardId).toBe(ids[2]);
});

test("any other failure keeps the grade for Try again and does not reload", async () => {
  const { c, api } = setup();
  vi.mocked(api.grade).mockRejectedValueOnce(new ApiClientError(500, "unknown", "boom"));
  c.reveal();
  await c.grade("nearly");
  expect(api.load).not.toHaveBeenCalled();
  expect(c.getView()).toMatchObject({ failed: true, done: 0 });
});
