import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/settings", useRouter: () => ({ push: () => {} }) }));

import { AVATAR_IDS } from "@/shared/avatars";
import { nextItemIndex, ProfileMenu, ProfileMenuItems } from "./ProfileMenu";
import { Sidebar } from "./Sidebar";

test("closed by default: one button with avatar and name, popup and expanded set", () => {
  const html = renderToStaticMarkup(<ProfileMenu name="Ada" avatar={AVATAR_IDS[0]} />);
  expect(html).toContain('aria-haspopup="menu"');
  expect(html).toContain('aria-expanded="false"');
  expect(html).toContain("Ada");
  expect(html).toContain(`/avatars/${AVATAR_IDS[0]}.webp`);
  expect(html).not.toContain('role="menu"');
});

test("items in order with their targets, Settings current on /settings", () => {
  const html = renderToStaticMarkup(<ProfileMenuItems path="/settings" onLogOut={() => {}} />);
  const labels = [...html.matchAll(/<(a|button)\b[^>]*role="menuitem"[\s\S]*?<\/\1>/g)].map((m) => m[0].replace(/<[^>]+>/g, ""));
  expect(labels).toEqual(["Profile", "Settings", "Switch profile", "Log out"]);
  expect([...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1])).toEqual(["/profile", "/settings", "/?switch=1"]);
  expect(html.match(/aria-current="page"/g)).toHaveLength(1);
  expect(html).toMatch(/href="\/settings"[^>]*aria-current="page"|aria-current="page"[^>]*href="\/settings"/);
  expect(html.match(/min-h-11/g)).toHaveLength(4);
  expect(html).not.toMatch(/#[0-9a-f]{3,6}\b/i);
});

test("arrow keys wrap between items, Home and End jump", () => {
  expect(nextItemIndex("ArrowDown", 0, 4)).toBe(1);
  expect(nextItemIndex("ArrowDown", 3, 4)).toBe(0);
  expect(nextItemIndex("ArrowUp", 0, 4)).toBe(3);
  expect(nextItemIndex("Home", 2, 4)).toBe(0);
  expect(nextItemIndex("End", 0, 4)).toBe(3);
  expect(nextItemIndex("a", 0, 4)).toBeNull();
});

test("Settings is not in the main nav", () => {
  const html = renderToStaticMarkup(<Sidebar name="Ada" avatar={AVATAR_IDS[0]} />);
  expect(html).not.toMatch(/<a[^>]*href="\/settings"/);
});
