import { afterEach, describe, expect, test, vi } from "vitest";
import { api, ApiClientError } from "@/ui/api/client";
import { FOCUS_RING, PRESSED } from "@/ui/button/button-class";
import { CONFIRM_DELETE_CLASS, DELETE_ERROR, deleteDeck } from "./DeleteDeck";

test("the confirm delete button has hover, pressed and focus classes", () => {
  expect(CONFIRM_DELETE_CLASS).toContain("hover:bg-error-container");
  expect(CONFIRM_DELETE_CLASS).toContain("active:bg-error-container");
  expect(CONFIRM_DELETE_CLASS).toContain(PRESSED);
  expect(CONFIRM_DELETE_CLASS).toContain(FOCUS_RING);
});

describe("deleteDeck", () => {
  afterEach(() => vi.restoreAllMocks());

  test("a failed delete returns the existing error message", async () => {
    vi.spyOn(api, "deleteDeck").mockRejectedValue(new ApiClientError(500, "unknown", "boom"));
    expect(await deleteDeck("d1")).toBe(DELETE_ERROR);
  });

  test("a successful delete returns null and calls the client with the id", async () => {
    const spy = vi.spyOn(api, "deleteDeck").mockResolvedValue(null);
    expect(await deleteDeck("d1")).toBeNull();
    expect(spy).toHaveBeenCalledWith("d1");
  });
});
