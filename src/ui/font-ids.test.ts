import { describe, expect, it } from "vitest";
import { FONT_IDS } from "@/shared/enums";
import { DEFAULT_BODY_FONT, FONT_FAMILY, HEADING_FONT_VARIABLE } from "./font-ids";
import { readFileSync } from "node:fs";

describe("font ids", () => {
  it("maps every font id", () => {
    expect(Object.keys(FONT_FAMILY).sort()).toEqual([...FONT_IDS].sort());
    expect(FONT_FAMILY.atkinson).toBe("var(--font-atkinson)");
    expect(FONT_FAMILY.lexend).toBe("var(--font-lexend)");
    expect(FONT_FAMILY.system).toContain("system-ui");
  });
  it("defaults to Atkinson body with Lexend headings", () => {
    expect(DEFAULT_BODY_FONT).toBe("atkinson");
    expect(HEADING_FONT_VARIABLE).toBe("--font-lexend");
    const css = readFileSync("src/app/globals.css", "utf8");
    expect(css).toMatch(/body\s*{[^}]*font-family:\s*var\(--font-atkinson\)/);
    expect(css).toMatch(/h1[^{]*{[^}]*font-family:\s*var\(--font-lexend\)/);
  });
});
