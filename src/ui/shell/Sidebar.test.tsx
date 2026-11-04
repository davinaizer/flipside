import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/library", useRouter: () => ({ push: () => {} }) }));

import { AVATAR_IDS } from "@/shared/avatars";
import { SidebarView } from "./Sidebar";

const render = (collapsed: boolean) =>
  renderToStaticMarkup(<SidebarView name="Ada" avatar={AVATAR_IDS[0]} collapsed={collapsed} onToggle={() => {}} />);

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
  expect(html).toContain('aria-expanded="false"');
});

test("expanded: labels and name shown, nav links carry no aria-label override", () => {
  const html = render(false);
  expect(html).toContain("Library</a>");
  expect(html).toContain("Progress</a>");
  expect(html).toContain("Flipside");
  expect(html).toContain(">Ada<");
  expect(html).not.toContain('aria-label="Library"');
  expect(html).toContain('aria-expanded="true"');
});

test("toggle has an accessible name and a 44 px target in both states", () => {
  for (const c of [true, false]) {
    const btn = render(c).match(/<button[^>]*aria-label="Sidebar"[^>]*>/)?.[0] ?? "";
    expect(btn).toContain("size-11");
  }
});
