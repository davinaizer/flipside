import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, test, vi } from "vitest";
import { AVATAR_IDS } from "@/shared/avatars";
import { api } from "@/ui/api/client";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {}, push: () => {} }) }));

import { nameError, ProfileForm, ProfileScreen } from "./ProfileScreen";

afterEach(() => vi.unstubAllGlobals());

const second = AVATAR_IDS[1];

test("shows every avatar, the selected one with a tick icon, and the name field", () => {
  const html = renderToStaticMarkup(
    <ProfileForm name="Nicole" avatar={second} onSave={async () => {}} />,
  );
  for (const id of AVATAR_IDS) expect(html).toContain(`value="${id}"`);
  expect(html).toMatch(
    new RegExp(`<input[^>]*checked[^>]*value="${second}"|<input[^>]*value="${second}"[^>]*checked`),
  );
  expect(html).toContain('aria-label="Avatar 2"');
  expect(html).toContain(`/avatars/${second}.webp`);
  expect(html.match(/data-selected/g)).toHaveLength(1);
  expect(html).toContain('value="Nicole"');
  expect(html).toContain("Save");
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
    profile: {
      id: "3f0c1b7e-0000-4000-8000-000000000001",
      name: "Nic",
      avatar: AVATAR_IDS[0],
      accent: "x",
      timezone: "UTC",
      dayStartHour: 4,
    },
    settings: (await import("@/shared/settings")).DEFAULT_SETTINGS,
  };
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(me), { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  await api.updateProfile({ name: "Nic", avatar: AVATAR_IDS[0] });
  const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
  expect(url).toBe("/api/v1/me");
  expect(init.method).toBe("PATCH");
  expect(JSON.parse(init.body as string)).toEqual({ name: "Nic", avatar: AVATAR_IDS[0] });
});

test("the screen has no Sign out button (it lives in the sidebar menu)", () => {
  expect(renderToStaticMarkup(<ProfileScreen name="Nicole" avatar={second} />)).not.toContain(
    "Sign out",
  );
});

test("the Profile page has a Change password form with three labelled fields", () => {
  const html = renderToStaticMarkup(<ProfileScreen name="Nicole" avatar={second} />);
  for (const label of ["Current password", "New password", "Confirm new password"]) {
    expect(html).toContain(label);
  }
  expect(html).toContain("Change password");
});
