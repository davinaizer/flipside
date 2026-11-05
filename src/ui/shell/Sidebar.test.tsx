import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/library",
  useRouter: () => ({ push: () => {} }),
}));

import { AVATAR_IDS } from "@/shared/avatars";
import { SidebarView } from "./Sidebar";

const render = (collapsed: boolean) =>
  renderToStaticMarkup(<SidebarView name="Ada" avatar={AVATAR_IDS[0]} collapsed={collapsed} />);

test("collapsed: two nav icons with name and tooltip, avatar, no labels or profile name", () => {
  const html = render(true);
  for (const label of ["Library", "Progress"]) {
    expect(html).toContain(`aria-label="${label}"`);
    expect(html).toContain(`title="${label}"`);
    expect(html).not.toContain(`>${label}<`);
  }
  expect(html).not.toContain("Flipside<");
  expect(html).not.toContain(">Ada<");
  expect(html).toContain('aria-label="Ada"');
  expect(html).toContain(`/avatars/${AVATAR_IDS[0]}.webp`);
  expect(html).not.toContain('aria-label="Sidebar"');
});

test("expanded: labels and name shown, nav links carry no aria-label override", () => {
  const html = render(false);
  expect(html).toContain("Library</a>");
  expect(html).toContain("Progress</a>");
  expect(html).toContain("Flipside");
  expect(html).toContain(">Ada<");
  expect(html).not.toContain('aria-label="Library"');
});

test("the width animates unless the user prefers reduced motion, and the toggle is not in the sidebar", () => {
  for (const c of [true, false]) {
    const html = render(c);
    expect(html).toContain("transition-[width]");
    expect(html).toContain("motion-reduce:transition-none");
    expect(html).not.toContain('aria-label="Sidebar"');
  }
});
