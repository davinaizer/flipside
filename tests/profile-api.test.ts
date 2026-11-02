import { expect, test, vi, inject } from "vitest";
import { freshDatabase } from "./helpers/db";

async function setup() {
  const url = await freshDatabase(inject("testDatabaseUrl"), "flipside_profile_api");
  vi.stubEnv("DATABASE_URL", url);
  const { runMigrations } = await import("@/server/db/migrate");
  const { getDb } = await import("@/server/db/client");
  const db = getDb();
  await runMigrations(db);
  return db;
}

test("profiles list, select sets the cookie, me returns profile and settings", async () => {
  const db = await setup();
  const { createProfile } = await import("./factories");
  const schemas = await import("@/shared/schemas/profile");
  const a = await createProfile(db, { name: "Ada", settings: { theme: "dark" } });
  await createProfile(db, { name: "Bo" });

  const list = await import("@/app/api/v1/profiles/route");
  const listed = await (await list.GET()).json();
  const parsed = schemas.profileListSchema.parse(listed);
  expect(parsed.profiles.map((p) => Object.keys(p).sort())).toEqual([
    ["avatar", "id", "name"],
    ["avatar", "id", "name"],
  ]);

  const sel = await import("@/app/api/v1/session/profile/route");
  const post = (body: unknown) =>
    sel.POST(new Request("http://x/", { method: "POST", body: JSON.stringify(body) }));
  const ok = await post({ profileId: a.id });
  expect(ok.status).toBe(200);
  const cookie = ok.headers.get("set-cookie")!;
  expect(cookie).toContain(`flipside_profile=${a.id}`);
  expect(cookie).toContain("HttpOnly");
  expect(cookie).toContain("SameSite=Lax");
  expect(cookie).not.toMatch(/secure/i);

  const unknown = await post({ profileId: "00000000-0000-4000-8000-000000000000" });
  expect(unknown.status).toBe(404);
  expect(unknown.headers.get("set-cookie")).toBeNull();
  expect((await post({ profileId: "nope" })).status).toBe(400);

  const me = await import("@/app/api/v1/me/route");
  const res = await me.GET(
    new Request("http://x/", { headers: { cookie: `flipside_profile=${a.id}` } }),
  );
  const body = schemas.meSchema.parse(await res.json());
  expect(body.profile.name).toBe("Ada");
  expect(body.settings.theme).toBe("dark");
  expect(body.settings.font).toBe("atkinson");
  expect((await me.GET(new Request("http://x/"))).status).toBe(401);
});
