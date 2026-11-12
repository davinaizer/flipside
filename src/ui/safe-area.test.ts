import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (p: string) => readFileSync(p, "utf8");

describe("safe-area padding (W2)", () => {
  const css = read("src/app/globals.css");
  it("adds each device inset to the element's own padding", () => {
    for (const [cls, side] of [
      ["t", "top"],
      ["r", "right"],
      ["b", "bottom"],
      ["l", "left"],
    ]) {
      expect(css).toMatch(
        new RegExp(
          `\\.safe-${cls} \\{\\s*padding-${side}: calc\\(var\\(--edge, 0px\\) \\+ env\\(safe-area-inset-${side}\\)\\)`,
        ),
      );
    }
  });

  // Each outer container names the sides it touches. The shell splits them: the sidebar takes
  // top, bottom and left; the content column takes top, right and bottom.
  const all = ["safe-t", "safe-r", "safe-b", "safe-l"];
  const cases: [string, string, string[]][] = [
    ["src/ui/shell/Sidebar.tsx", "<aside", ["safe-t", "safe-b", "safe-l"]],
    ["src/app/(app)/layout.tsx", "flex min-w-0 flex-1 flex-col", ["safe-t", "safe-r", "safe-b"]],
    ["src/ui/profile/ProfilePicker.tsx", "<main", all],
    ["src/ui/profile/LoginScreen.tsx", "<main", all],
    ["src/ui/practice/PracticeView.tsx", "min-h-screen w-full max-w-3xl", all],
    ["src/ui/practice/SummaryView.tsx", "max-w-5xl flex-col", all],
    ["src/ui/practice/SettingsPopover.tsx", "fixed inset-0", all],
    ["src/ui/practice/PracticeScreen.tsx", "max-w-3xl flex-col gap-6", all],
  ];
  it.each(cases)("%s pads its outer edges", (file, anchor, classes) => {
    const src = read(file);
    const i = src.indexOf(anchor);
    expect(i).toBeGreaterThan(-1);
    const end = src.indexOf("[--edge", i);
    expect(end).toBeGreaterThan(-1);
    const classNames = src.slice(Math.max(0, i - 200), end);
    for (const c of classes) expect(classNames).toContain(c);
  });

  it("widens the sidebar by the left inset in both states", () => {
    const src = read("src/ui/shell/Sidebar.tsx");
    expect(src).toContain("w-[calc(5rem+env(safe-area-inset-left))]");
    expect(src).toContain("w-[calc(16rem+env(safe-area-inset-left))]");
  });

  it("overlays the page below 640 px with a rail-width spacer (F23.7)", () => {
    const src = read("src/ui/shell/Sidebar.tsx");
    expect(src).toContain("fixed left-0 top-0");
    expect(src).toContain("sm:sticky");
    expect(src).toContain("w-[calc(5rem+env(safe-area-inset-left))] shrink-0 sm:hidden");
  });

  // The absolute items sit against the padding box, so the main element's padding does not move them.
  it.each(["src/ui/profile/LoginScreen.tsx", "src/ui/profile/ProfilePicker.tsx"])(
    "%s offsets the theme switch by the top and right insets",
    (file) => {
      const src = read(file);
      expect(src).toContain("right-[calc(2rem+env(safe-area-inset-right))]");
      expect(src).toContain("top-[calc(1rem+env(safe-area-inset-top))]");
    },
  );
  it("offsets the login version line by the bottom inset", () => {
    expect(read("src/ui/profile/LoginScreen.tsx")).toContain(
      "bottom-[calc(1rem+env(safe-area-inset-bottom))]",
    );
  });
});
