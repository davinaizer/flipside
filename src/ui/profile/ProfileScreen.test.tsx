import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, test, vi } from "vitest";
import { AVATAR_IDS } from "@/shared/avatars";
import { api } from "@/ui/api/client";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {} }) }));

import { nameError, ProfileForm } from "./ProfileScreen";

afterEach(() => vi.unstubAllGlobals());

test("shows every avatar, the selected one with a tick icon, and the name field", () => {
  const html = renderToStaticMarkup(<ProfileForm name="Nicole" avatar="owl" onSave={async () => {}} />);
  for (const id of AVATAR_IDS) expect(html).toContain(`value="${id}"`);
  expect(html).toMatch(/<input[^>]*checked[^>]*value="owl"|<input[^>]*value="owl"[^>]*checked/);
  expect(html.match(/data-selected/g)).toHaveLength(1);
  expect(html).toContain('value="Nicole"');
  expect(html).toContain("Save");
  expect(html).toContain('data-slot="sign-out"');
});

test("name must be 1 to 24 characters after trimming", () => {
  expect(nameError("")).toMatch(/empty/);
  expect(nameError("   ")).toMatch(/empty/);
  expect(nameError("a".repeat(25))).toMatch(/24/);
  expect(nameError("a".repeat(24))).toBeNull();
  expect(nameError("  Nic  ")).toBeNull();
});

test("Save calls PATCH /me with the avatar and name", async () => {
  const me = {
    profile: { id: "3f0c1b7e-0000-4000-8000-000000000001", name: "Nic", avatar: "fox", accent: "x", timezone: "UTC", dayStartHour: 4 },
    settings: (await import("@/shared/settings")).DEFAULT_SETTINGS,
  };
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(me), { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  await api.updateProfile({ name: "Nic", avatar: "fox" });
  const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
  expect(url).toBe("/api/v1/me");
  expect(init.method).toBe("PATCH");
  expect(JSON.parse(init.body as string)).toEqual({ name: "Nic", avatar: "fox" });
});
