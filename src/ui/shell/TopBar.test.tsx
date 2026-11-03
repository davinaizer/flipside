import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";

vi.mock("@/ui/settings/ThemeToggle", () => ({ ThemeToggle: () => <button role="switch" aria-label="Dark theme" /> }));
vi.mock("next/navigation", () => ({ usePathname: () => "/library" }));

import { AVATAR_IDS } from "@/shared/avatars";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

const avatar = AVATAR_IDS[0];

test("top bar has the toggle and an avatar, and no product title", () => {
  const html = renderToStaticMarkup(<TopBar name="Ada" avatar={avatar} />);
  expect(html).toContain('role="switch"');
  expect(html).toContain(`/avatars/${avatar}.webp`);
  expect(html).not.toContain("Flipside");
});

test("sidebar no longer renders the toggle", () => {
  expect(renderToStaticMarkup(<Sidebar name="Ada" avatar={avatar} />)).not.toContain('role="switch"');
});

test("top bar avatar is a link to /profile named for the profile", () => {
  const html = renderToStaticMarkup(<TopBar name="Ada" avatar={avatar} />);
  expect(html).toMatch(/<a[^>]*href="\/profile"[^>]*aria-label="Ada, open profile"|<a[^>]*aria-label="Ada, open profile"[^>]*href="\/profile"/);
});

test("sidebar shows the profile name and avatar passed from the layout", () => {
  const html = renderToStaticMarkup(<Sidebar name="Grace" avatar={avatar} />);
  expect(html).toContain("Grace");
  expect(html).toContain(`/avatars/${avatar}.webp`);
});
