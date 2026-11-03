import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";

vi.mock("@/ui/settings/ThemeToggle", () => ({ ThemeToggle: () => <button role="switch" aria-label="Dark theme" /> }));
vi.mock("next/navigation", () => ({ usePathname: () => "/library" }));

import { AVATAR_IDS } from "@/shared/avatars";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

const avatar = AVATAR_IDS[0];

test("top bar has the toggle and an avatar, and no product title", () => {
  const html = renderToStaticMarkup(<TopBar avatar={avatar} />);
  expect(html).toContain('role="switch"');
  expect(html).toContain("🦊");
  expect(html).not.toContain("Flipside");
});

test("sidebar no longer renders the toggle", () => {
  expect(renderToStaticMarkup(<Sidebar name="Ada" avatar={avatar} />)).not.toContain('role="switch"');
});
