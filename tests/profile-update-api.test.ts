import { expect, test, vi, inject } from "vitest";
import { freshDatabase } from "./helpers/db";

async function setup() {
  const url = await freshDatabase(inject("testDatabaseUrl"), "flipside_profile_update_api");
  vi.stubEnv("DATABASE_URL", url);
  const { runMigrations } = await import("@/server/db/migrate");
  const { getDb } = await import("@/server/db/client");
  const db = getDb();
  await runMigrations(db);
  return db;
}

test("PATCH /me updates the current profile only, 422 on bad input, duplicate avatars allowed", async () => {
  const db = await setup();
  const { createProfile } = await import("./factories");
  const a = await createProfile(db, { name: "Ada", avatar: "fox" });
  const b = await createProfile(db, { name: "Bo", avatar: "owl" });
  const me = await import("@/app/api/v1/me/route");
  const as = (id: string) => (body: unknown) =>
    me.PATCH(
      new Request("http://x/", {
        method: "PATCH",
        headers: { cookie: `flipside_profile=${id}` },
        body: JSON.stringify(body),
      }),
    );
  const patchA = as(a.id);

  const ok = await patchA({ avatar: "otter", name: "  Ada L  " });
  expect(ok.status).toBe(200);
  const got = await ok.json();
  expect(got.profile).toMatchObject({ name: "Ada L", avatar: "otter" });

  const again = await me.GET(new Request("http://x/", { headers: { cookie: `flipside_profile=${a.id}` } }));
  expect((await again.json()).profile).toMatchObject({ name: "Ada L", avatar: "otter" });
  const other = await me.GET(new Request("http://x/", { headers: { cookie: `flipside_profile=${b.id}` } }));
  expect((await other.json()).profile).toMatchObject({ name: "Bo", avatar: "owl" });

  const dup = await patchA({ avatar: "owl" });
  expect(dup.status).toBe(200);
  expect((await dup.json()).profile.name).toBe("Ada L");

  for (const bad of [{ name: "   " }, { name: "x".repeat(25) }, { avatar: "dragon" }, {}]) {
    const res = await patchA(bad);
    expect(res.status).toBe(422);
    expect((await res.json()).error.message.length).toBeGreaterThan(0);
  }
  const nonJson = await me.PATCH(
    new Request("http://x/", { method: "PATCH", headers: { cookie: `flipside_profile=${a.id}` }, body: "no" }),
  );
  expect(nonJson.status).toBe(400);
  const noAuth = await me.PATCH(new Request("http://x/", { method: "PATCH", body: "{}" }));
  expect(noAuth.status).toBe(401);
});
