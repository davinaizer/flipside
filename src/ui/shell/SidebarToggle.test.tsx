import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { SidebarToggleView } from "./SidebarToggle";

const render = (collapsed: boolean) =>
  renderToStaticMarkup(<SidebarToggleView collapsed={collapsed} onToggle={() => {}} />);

test("toggle has an accessible name, aria-expanded and a 44 px target in both states", () => {
  for (const [collapsed, expanded, title] of [
    [true, "false", "Expand sidebar"],
    [false, "true", "Collapse sidebar"],
  ] as const) {
    const btn = render(collapsed).match(/<button[^>]*>/)?.[0] ?? "";
    expect(btn).toContain('aria-label="Sidebar"');
    expect(btn).toContain(`aria-expanded="${expanded}"`);
    expect(btn).toContain(`title="${title}"`);
    expect(btn).toContain("size-11");
  }
});

test("the icon changes with the state: chevron left to collapse, right to expand", () => {
  expect(render(false)).toContain("M15 10l-2 2 2 2");
  expect(render(false)).not.toContain("M13 10l2 2-2 2");
  expect(render(true)).toContain("M13 10l2 2-2 2");
  expect(render(true)).not.toContain("M15 10l-2 2 2 2");
});
