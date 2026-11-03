import { expect, test } from "vitest";
import { FOCUS_RING, PRESSED } from "@/ui/button/button-class";
import { CONFIRM_DELETE_CLASS } from "./DeleteDeck";


test("the confirm delete button has hover, pressed and focus classes", () => {
  expect(CONFIRM_DELETE_CLASS).toContain("hover:bg-error-container");
  expect(CONFIRM_DELETE_CLASS).toContain("active:bg-error-container");
  expect(CONFIRM_DELETE_CLASS).toContain(PRESSED);
  expect(CONFIRM_DELETE_CLASS).toContain(FOCUS_RING);
});
