import { describe, expect, it } from "vitest";
import { buttonClass, FOCUS_RING, PRESSED, TAPPABLE_CARD } from "./button-class";

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
    const c = buttonClass("primary", { size: "large" });
    expect(c).toContain("min-h-14");
    expect(c).not.toContain("min-h-11");
  });

  it("appends layout classes", () => {
    expect(buttonClass("primary", { extra: "mt-4" })).toMatch(/ mt-4$/);
  });
});

describe("interaction states", () => {
  it("every variant has hover, pressed and a focus ring, with pressed motion guarded", () => {
    for (const v of ["primary", "secondary", "danger"] as const) {
      const c = buttonClass(v);
      expect(c).toMatch(/hover:bg-/);
      expect(c).toMatch(/active:bg-/);
      expect(c).toContain("focus-visible:outline-2");
      expect(c).toContain("active:scale-[0.98]");
      expect(c).toContain("motion-reduce:active:scale-100");
    }
  });

  it("tappable cards use the same pressed and focus classes", () => {
    expect(TAPPABLE_CARD).toContain(PRESSED);
    expect(TAPPABLE_CARD).toContain(FOCUS_RING);
    expect(TAPPABLE_CARD).toContain("hover:bg-");
    expect(TAPPABLE_CARD).toContain("active:bg-");
  });
});
