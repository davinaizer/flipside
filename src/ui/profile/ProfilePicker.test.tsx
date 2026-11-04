import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, test, vi } from "vitest";
import { AVATAR_IDS } from "@/shared/avatars";
import { api } from "@/ui/api/client";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {}, push: () => {} }) }));

import { ProfilePickerReady } from "./ProfilePicker";
import { ProfileForm, nameError } from "./ProfileScreen";

afterEach(() => vi.unstubAllGlobals());

test("Add User sits below the profile list and the form starts closed", () => {
  const html = renderToStaticMarkup(
    <ProfilePickerReady
      profiles={[{ id: "3f0c1b7e-0000-4000-8000-000000000001", name: "Nic", avatar: AVATAR_IDS[0] }]}
      onPick={() => {}}
      onCreated={() => {}}
    />,
  );
  expect(html.indexOf("Add User")).toBeGreaterThan(html.indexOf("</ul>"));
  expect(html).not.toContain("new-profile-name");
});

test("the form has name and avatar, Cancel, and the Profile page validation messages", () => {
  const html = renderToStaticMarkup(
    <ProfileForm name="" avatar={AVATAR_IDS[0]} idPrefix="new-profile" submitLabel="Add" onSave={async () => {}} onCancel={() => {}} />,
  );
  expect(html).toContain('id="new-profile-name"');
  for (const id of AVATAR_IDS) expect(html).toContain(`value="${id}"`);
  expect(html).toContain("Cancel");
  expect(nameError(" ")).toBe("Name cannot be empty");
  expect(nameError("a".repeat(25))).toBe("Name must be 24 characters or fewer");
});

test("api.createProfile POSTs name and avatar and returns the new profile", async () => {
  const created = { id: "3f0c1b7e-0000-4000-8000-000000000002", name: "Zed", avatar: AVATAR_IDS[1], accent: "x", timezone: "UTC", dayStartHour: 4 };
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(created), { status: 201 }));
  vi.stubGlobal("fetch", fetchMock);
  const p = await api.createProfile({ name: "Zed", avatar: AVATAR_IDS[1] });
  expect(p.name).toBe("Zed");
  const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
  expect(url).toBe("/api/v1/profiles");
  expect(init.method).toBe("POST");
  expect(JSON.parse(init.body as string)).toEqual({ name: "Zed", avatar: AVATAR_IDS[1] });
});
