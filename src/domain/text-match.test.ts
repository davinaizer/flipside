import { describe, expect, it } from "vitest";
import { foldText, matchesQuery } from "./text-match";

describe("text match", () => {
  it("ignores case and accents", () => {
    expect(foldText("Química")).toBe("quimica");
    expect(matchesQuery("Química", "quimica")).toBe(true);
    expect(matchesQuery("Quimica", "QUÍM")).toBe(true);
  });
  it("matches a blank query and rejects a miss", () => {
    expect(matchesQuery("Science", "  ")).toBe(true);
    expect(matchesQuery("Science", "xyz")).toBe(false);
  });
  it("needs every word", () => {
    expect(matchesQuery("Cell biology", "bio cell")).toBe(true);
    expect(matchesQuery("Cell biology", "cell chem")).toBe(false);
  });
});
