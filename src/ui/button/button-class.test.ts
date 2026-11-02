import { describe, expect, it } from "vitest";
import { buttonClass } from "./button-class";

describe("buttonClass", () => {
  it("keeps the 44px pill on every variant", () => {
    for (const v of ["primary", "secondary", "danger"] as const) {
      expect(buttonClass(v)).toContain("min-h-11");
      expect(buttonClass(v)).toContain("rounded-full");
    }
  });

  it("secondary is tinted and borderless", () => {
    const c = buttonClass("secondary");
    expect(c).toContain("bg-surface-container-high");
    expect(c).not.toContain("outline-outline");
  });

  it("large replaces the height instead of stacking two", () => {
    const c = buttonClass("primary", { large: true });
    expect(c).toContain("min-h-14");
    expect(c).not.toContain("min-h-11");
  });

  it("appends layout classes", () => {
    expect(buttonClass("primary", { extra: "mt-4" })).toMatch(/ mt-4$/);
  });
});
