import { expect, test } from "vitest";
import { shortcutFor } from "./shortcuts";

const el = (tagName: string, extra: object = {}) =>
  ({ tagName, closest: () => null, ...extra }) as unknown as EventTarget;
const body = el("BODY");
const front = { revealed: false, dialogOpen: false };
const back = { revealed: true, dialogOpen: false };

test("Space shows the answer on the front only", () => {
  expect(shortcutFor({ key: " ", target: body }, front)).toEqual({ type: "reveal" });
  expect(shortcutFor({ key: " ", target: body }, back)).toBeNull();
});

test("1, 2 and 3 grade only when the answer is visible", () => {
  expect(shortcutFor({ key: "1", target: body }, front)).toBeNull();
  expect(shortcutFor({ key: "1", target: body }, back)).toEqual({
    type: "grade",
    grade: "not_yet",
  });
  expect(shortcutFor({ key: "2", target: body }, back)).toEqual({ type: "grade", grade: "nearly" });
  expect(shortcutFor({ key: "3", target: body }, back)).toEqual({ type: "grade", grade: "got_it" });
  expect(shortcutFor({ key: "4", target: body }, back)).toBeNull();
});

test("nothing fires inside inputs, in a dialog, with modifiers or on repeat", () => {
  expect(shortcutFor({ key: "1", target: el("INPUT") }, back)).toBeNull();
  expect(shortcutFor({ key: " ", target: el("TEXTAREA") }, front)).toBeNull();
  expect(
    shortcutFor({ key: " ", target: el("DIV", { isContentEditable: true }) }, front),
  ).toBeNull();
  expect(shortcutFor({ key: "1", target: el("DIV", { closest: () => ({}) }) }, back)).toBeNull();
  expect(shortcutFor({ key: " ", target: body }, { revealed: false, dialogOpen: true })).toBeNull();
  expect(shortcutFor({ key: "1", target: body }, { revealed: true, dialogOpen: true })).toBeNull();
  expect(shortcutFor({ key: "1", target: body, metaKey: true }, back)).toBeNull();
  expect(shortcutFor({ key: "1", target: body, repeat: true }, back)).toBeNull();
});

test("Space on a focused button is left to the button", () => {
  expect(shortcutFor({ key: " ", target: el("BUTTON") }, front)).toBeNull();
  expect(shortcutFor({ key: "1", target: el("BUTTON") }, back)).toEqual({
    type: "grade",
    grade: "not_yet",
  });
});
