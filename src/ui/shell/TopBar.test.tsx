import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";

vi.mock("@/ui/settings/ThemeToggle", () => ({
  ThemeToggle: () => <button role="switch" aria-label="Dark theme" />,
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/library",
  useRouter: () => ({ push: () => {} }),
}));

import { AVATAR_IDS } from "@/shared/avatars";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

const avatar = AVATAR_IDS[0];

test("top bar has the sidebar toggle on the left and the theme switch on the right: no avatar, no profile link, no product title", () => {
  const html = renderToStaticMarkup(<TopBar />);
  expect(html).toContain('role="switch"');
  expect(html).toContain('aria-label="Sidebar"');
  expect(html.indexOf('aria-label="Sidebar"')).toBeLessThan(html.indexOf('role="switch"'));
  expect(html).toContain("justify-between");
  expect(html).not.toContain("/avatars/");
  expect(html).not.toContain("<a");
  expect(html).not.toContain("Flipside");
});

test("sidebar no longer renders the toggle", () => {
  expect(renderToStaticMarkup(<Sidebar name="Ada" avatar={avatar} />)).not.toContain(
    'role="switch"',
  );
});

test("sidebar shows the profile name and avatar passed from the layout", () => {
  const html = renderToStaticMarkup(<Sidebar name="Grace" avatar={avatar} />);
  expect(html).toContain("Grace");
  expect(html).toContain(`/avatars/${avatar}.webp`);
});
