import { expect, test, vi, inject } from "vitest";
import { freshDatabase } from "./helpers/db";
import { checkAccess } from "@/server/http/access";

test("POST /profiles creates a profile with defaults and validates input", async () => {
  const url = await freshDatabase(inject("testDatabaseUrl"), "flipside_profiles_create");
  vi.stubEnv("DATABASE_URL", url);
  const { runMigrations } = await import("@/server/db/migrate");
  const { getDb } = await import("@/server/db/client");
  await runMigrations(getDb());
  const route = await import("@/app/api/v1/profiles/route");
  const { AVATAR_IDS } = await import("@/shared/avatars");
  const post = (body: unknown) =>
    route.POST(new Request("http://x/", { method: "POST", body: JSON.stringify(body) }));

  const ok = await post({ name: "  Mia  ", avatar: AVATAR_IDS[0] });
  expect(ok.status).toBe(201);
  expect(await ok.json()).toMatchObject({
    name: "Mia",
    avatar: AVATAR_IDS[0],
    timezone: "Europe/London",
    dayStartHour: 7,
  });
  const listed = (await (await route.GET()).json()).profiles;
  expect(listed.map((p: { name: string }) => p.name)).toContain("Mia");

  const bad = [
    { name: "", avatar: AVATAR_IDS[0] },
    { name: "   ", avatar: AVATAR_IDS[0] },
    { name: "x".repeat(25), avatar: AVATAR_IDS[0] },
    { name: "Mia", avatar: "nope" },
    { name: "Mia" },
    {},
  ];
  for (const b of bad) expect((await post(b)).status).toBe(400);
  expect((await post({ name: "x".repeat(24), avatar: AVATAR_IDS[1] })).status).toBe(201);
  expect(
    (await route.POST(new Request("http://x/", { method: "POST", body: "not json" }))).status,
  ).toBe(400);
});

test("POST /profiles is 401 without the sign-in cookie", () => {
  const res = checkAccess(new Request("http://x/api/v1/profiles", { method: "POST" }));
  expect(res?.status).toBe(401);
});
