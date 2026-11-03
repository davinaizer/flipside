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

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
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


type Doc = {
  colors: Record<string, string>;
  typography: Record<string, Record<string, string>>;
  rounded: Record<string, string>;
  spacing: Record<string, string>;
};

/** Reads the YAML front matter of a design file (only the shapes those files use). */
function readDoc(file: string): Doc {
  const text = readFileSync(join(__dirname, "../../docs/design", file), "utf8").split("---")[1];
  const doc: Doc = { colors: {}, typography: {}, rounded: {}, spacing: {} };
  let section = "";
  let item = "";
  for (const line of text.split("\n")) {
    const top = line.match(/^(\w+):/);
    if (top) {
      section = top[1];
      continue;
    }
    const entry = line.match(/^ {2}([\w-]+):\s*(.*)$/);
    if (entry && section in doc) {
      const [, key, value] = entry;
      if (section === "typography") {
        item = key;
        doc.typography[item] = {};
      } else (doc[section as "colors" | "rounded" | "spacing"])[key] = value.replace(/'/g, "");
      continue;
    }
    const prop = line.match(/^ {4}(\w+):\s*(.*)$/);
    if (prop && section === "typography") doc.typography[item][prop[1]] = prop[2].replace(/'/g, "");
  }
  return doc;
}

const lightDoc = readDoc("DESIGN.md");
const darkDoc = readDoc("DESIGN-DARK.md");

function warm(hex: string): boolean {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return r > g && g > b;
}
function green(hex: string): boolean {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return g > r && g >= b * 0.8;
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
  ["on-secondary-container", "secondary-container"],
  ["on-tertiary-container", "tertiary-container"],
  ["on-surface", "surface-container-lowest"],
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

  it("defines one elevation token in both themes and no per-component shadow values", () => {
    const elevation = (selector: string) => {
      const start = css.indexOf(selector + " {");
      const body = css.slice(css.indexOf("{", start) + 1, css.indexOf("}", start));
      return body.match(/--elevation-card:\s*([^;]+);/)?.[1];
    };
    const l = elevation(':root,\n[data-theme="light"]');
    const d = elevation('[data-theme="dark"]');
    expect(l).toBeDefined();
    expect(d).toBeDefined();
    expect(d).not.toBe("none");
    expect(css).toContain("--shadow-card: var(--elevation-card)");
    const doc = readFileSync(join(__dirname, "../../docs/design/DESIGN-DARK.md"), "utf8");
    expect(doc).toContain(d!);
    for (const file of walk(join(__dirname, ".."))) {
      if (!/\.tsx?$/.test(file) || file.endsWith(".test.ts") || file.endsWith(".test.tsx")) continue;
      expect(readFileSync(file, "utf8"), file).not.toMatch(/shadow-\[/);
    }
  });

  it("gives every card and surface the elevation token", () => {
    const missing: string[] = [];
    for (const file of walk(join(__dirname, ".."))) {
      if (!/\.tsx$/.test(file) || file.endsWith(".test.tsx")) continue;
      readFileSync(file, "utf8")
        .split("\n")
        .forEach((line, i) => {
          // A card is a rounded-card or rounded-3xl box; pills, fields and Skeleton placeholders are not.
          const isCard = /rounded-(card|3xl)\b/.test(line) && !/Skeleton/.test(line);
          if (isCard && !line.includes("shadow-card")) missing.push(`${file}:${i + 1}`);
        });
    }
    expect(missing).toEqual([]);
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

  describe("design files", () => {
    it("share one typography scale, spacing scale and radius scale", () => {
      expect(darkDoc.typography).toEqual(lightDoc.typography);
      expect(darkDoc.spacing).toEqual(lightDoc.spacing);
      const { card: lightCard, ...lightRounded } = lightDoc.rounded;
      const { card: darkCard, ...darkRounded } = darkDoc.rounded;
      expect(darkRounded).toEqual(lightRounded);
      expect(lightCard).toBe("2rem");
      expect(darkCard).toBe("1rem");
    });

    it("use the same colour names", () => {
      expect(Object.keys(darkDoc.colors).sort()).toEqual(Object.keys(lightDoc.colors).sort());
    });

    it("give secondary and tertiary the same meaning in both themes", () => {
      for (const doc of [lightDoc, darkDoc]) {
        for (const k of ["secondary", "secondary-container"]) expect(warm(doc.colors[k])).toBe(true);
        for (const k of ["tertiary", "tertiary-container"]) expect(green(doc.colors[k])).toBe(true);
      }
    });

    it.each([
      ["light", light, lightDoc],
      ["dark", dark, darkDoc],
    ] as const)("%s tokens.css matches the colour values in the design file", (_, theme, doc) => {
      const wrong = Object.keys(theme)
        .filter((k) => k in doc.colors && theme[k].toLowerCase() !== doc.colors[k].toLowerCase())
        .map((k) => `${k}: ${theme[k]} vs ${doc.colors[k]}`);
      expect(wrong).toEqual([]);
    });

    it("tokens.css carries the shared type and spacing scales", () => {
      const missing: string[] = [];
      for (const [name, t] of Object.entries(lightDoc.typography)) {
        if (!css.includes(`--text-${name}: ${t.fontSize};`)) missing.push(`text-${name}`);
        if (!css.includes(`--text-${name}--line-height: ${t.lineHeight};`)) missing.push(`text-${name} line height`);
      }
      for (const [name, v] of Object.entries(lightDoc.spacing)) {
        if (!css.includes(`--spacing-${name}: ${v};`)) missing.push(`spacing-${name}`);
      }
      expect(missing).toEqual([]);
    });

    it("tokens.css card radius matches each theme", () => {
      expect(css).toMatch(/--card-radius: 2rem;/);
      expect(css).toMatch(/--card-radius: 1rem;/);
    });
  });

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

  // U2: every button needs hover/pressed/focus feedback, so it must go through one of the shared helpers.
  it("gives every <button under src/ui pressed and focus feedback", () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const f of readdirSync(dir)) {
        const p = join(dir, f);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.tsx$/.test(f) && !/\.test\.tsx$/.test(f)) {
          const src = readFileSync(p, "utf8");
          for (const m of src.matchAll(/<button\b[\s\S]*?<\/button>/g)) {
            const tag = m[0];
            const ok = /buttonClass|TAPPABLE_CARD|iconButton|CONFIRM_DELETE_CLASS/.test(tag) || (/PRESSED/.test(tag) && /FOCUS_RING/.test(tag));
            if (!ok) offenders.push(`${p}: ${tag.split("\n")[0]}`);
          }
        }
      }
    };
    walk(__dirname);
    expect(offenders).toEqual([]);
  });

  // Same rule for label controls (file picker, radio swatches and pills): a cursor-pointer label must show hover and pressed.
  it("gives every label.cursor-pointer control pressed feedback", () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const f of readdirSync(dir)) {
        const p = join(dir, f);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.tsx$/.test(f) && !/\.test\.tsx$/.test(f)) {
          const src = readFileSync(p, "utf8");
          for (const m of src.matchAll(/<label\b[^>]*cursor-pointer[\s\S]*?<\/label>/g)) {
            const tag = m[0];
            if (!/buttonClass/.test(tag) && !/peer-active:/.test(tag)) offenders.push(`${p}: ${tag.split("\n")[0]}`);
          }
        }
      }
    };
    walk(__dirname);
    expect(offenders).toEqual([]);
  });

  // Same rule for next/link: a Link that does not use buttonClass needs PRESSED, FOCUS_RING and an active: tone.
  it("gives every <Link not using buttonClass pressed, focus and active tone", () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const f of readdirSync(dir)) {
        const p = join(dir, f);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.tsx$/.test(f) && !/\.test\.tsx$/.test(f)) {
          const src = readFileSync(p, "utf8");
          for (const m of src.matchAll(/<Link\b[\s\S]*?>/g)) {
            const tag = m[0];
            const ok = /buttonClass|TAPPABLE_CARD/.test(tag) || (/PRESSED/.test(tag) && /FOCUS_RING/.test(tag) && /active:text-|active:bg-/.test(tag));
            if (!ok) offenders.push(`${p}: ${tag.split("\n")[0]}`);
          }
        }
      }
    };
    walk(__dirname);
    expect(offenders).toEqual([]);
  });
});
