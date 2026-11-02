import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { CARD_COLORS } from "../shared/enums";
import { describe, expect, it } from "vitest";

const css = readFileSync(join(__dirname, "tokens.css"), "utf8");

function block(selector: string): Record<string, string> {
  const start = css.indexOf(selector + " {");
  const body = css.slice(css.indexOf("{", start) + 1, css.indexOf("}", start));
  const out: Record<string, string> = {};
  for (const m of body.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6});/g)) out[m[1]] = m[2];
  return out;
}

const light = block(':root,\n[data-theme="light"]');
const dark = block('[data-theme="dark"]');

function lum(hex: string): number {
  const c = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function ratio(a: string, b: string): number {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

const pairs: [string, string][] = [
  ["on-surface", "surface"],
  ["on-surface", "surface-container-low"],
  ["on-surface", "surface-container"],
  ["on-surface-variant", "surface"],
  ["on-surface-variant", "surface-container"],
  ["on-primary", "primary"],
  ["on-primary-container", "primary-container"],
  ["on-secondary", "secondary"],
  ["on-error", "error"],
  ["primary", "surface"],
  ["on-surface", "surface-card"],
  ["on-surface-variant", "surface-card"],
  ["primary", "surface-card"],
  ["primary", "surface-container-high"],
  ["error", "surface-container-high"],
  ["on-tertiary", "tertiary"],
  ["on-error-container", "error-container"],
  ["inverse-on-surface", "inverse-surface"],
  ["on-box-new", "box-new"],
  ["on-box-not-yet", "box-not-yet"],
  ["on-box-nearly", "box-nearly"],
  ["on-box-got-it", "box-got-it"],
  ...CARD_COLORS.map((c): [string, string] => [`on-card-${c}`, `card-${c}`]),
];

describe("tokens", () => {
  it("light and dark define the same semantic names", () => {
    expect(Object.keys(dark).sort()).toEqual(Object.keys(light).sort());
    expect(Object.keys(light).length).toBeGreaterThan(10);
  });

  it("switches by data-theme, default light", () => {
    expect(css).toContain(":root,\n[data-theme=\"light\"]");
    expect(css).toContain('[data-theme="dark"]');
    const layout = readFileSync(join(__dirname, "../app/layout.tsx"), "utf8");
    expect(layout).toContain('"light"');
    expect(layout).toContain("data-theme={theme}");
  });

  it("has box tokens for New, Not yet, Nearly and Got it", () => {
    for (const b of ["new", "not-yet", "nearly", "got-it"]) {
      for (const t of [light, dark]) {
        expect(t[`box-${b}`]).toBeDefined();
        expect(t[`on-box-${b}`]).toBeDefined();
      }
    }
  });

  it("has bar tokens for New, Not yet, Nearly and Got it", () => {
    for (const b of ["new", "not-yet", "nearly", "got-it"]) {
      for (const t of [light, dark]) expect(t[`bar-${b}`]).toBeDefined();
    }
  });

  for (const [name, theme] of [
    ["light", light],
    ["dark", dark],
  ] as const) {
    it.each(pairs)(`${name}: %s on %s reaches 4.5:1`, (fg, bg) => {
      expect(ratio(theme[fg], theme[bg])).toBeGreaterThanOrEqual(4.5);
    });
  }

  it("has no raw hex in src outside the tokens file", () => {
    const hits: string[] = [];
    const walk = (dir: string) => {
      for (const f of readdirSync(dir)) {
        const p = join(dir, f);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.(tsx?|css|mjs)$/.test(f) && !p.endsWith("tokens.css") && !p.endsWith("tokens.test.ts")) {
          if (/#[0-9a-fA-F]{3,8}\b/.test(readFileSync(p, "utf8"))) hits.push(p);
        }
      }
    };
    walk(join(__dirname, ".."));
    expect(hits).toEqual([]);
  });
});
