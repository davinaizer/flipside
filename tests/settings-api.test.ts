import { expect, test, vi, inject } from "vitest";
import { freshDatabase } from "./helpers/db";

async function setup() {
  const url = await freshDatabase(inject("testDatabaseUrl"), "flipside_settings_api");
  vi.stubEnv("DATABASE_URL", url);
  const { runMigrations } = await import("@/server/db/migrate");
  const { getDb } = await import("@/server/db/client");
  const db = getDb();
  await runMigrations(db);
  return db;
}

const as = (id: string, body?: unknown) =>
  new Request("http://x/", {
    method: body === undefined ? "GET" : "PUT",
    headers: { "x-profile-id": id },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

test("settings: defaults merge, validation, per-profile isolation, persistence", async () => {
  const db = await setup();
  const { createProfile } = await import("./factories");
  const a = await createProfile(db, { name: "Ada", settings: { theme: "dark" } });
  const b = await createProfile(db, { name: "Bo" });
  const route = await import("@/app/api/v1/settings/route");

  const first = await (await route.GET(as(a.id))).json();
  expect(first.settings.theme).toBe("dark");
  expect(first.settings.font).toBe("atkinson");

  const next = { ...first.settings, font: "lexend", textSize: 4, cardColor: "sage" };
  const put = await route.PUT(as(a.id, next));
  expect(put.status).toBe(200);
  expect((await put.json()).settings.font).toBe("lexend");

  // A new client (no state beyond the profile id) sees the saved value; the other profile is untouched.
  expect((await (await route.GET(as(a.id))).json()).settings).toMatchObject({ font: "lexend", textSize: 4 });
  expect((await (await route.GET(as(b.id))).json()).settings).toMatchObject({ font: "atkinson", theme: "light" });

  for (const bad of [
    { font: "comic-sans" },
    { textSize: 9 },
    { cardColor: "#ff0000" },
    { theme: "blue" },
    { unknownKey: 1 },
  ]) {
    const res = await route.PUT(as(a.id, bad));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("invalid_request");
  }
  expect((await route.PUT(new Request("http://x/", { method: "PUT", headers: { "x-profile-id": a.id }, body: "{" }))).status).toBe(400);
  expect((await (await route.GET(as(a.id))).json()).settings.font).toBe("lexend");

  expect((await route.GET(new Request("http://x/"))).status).toBe(401);
  expect((await route.PUT(as(a.id, {}))).status).toBe(200);
  expect((await (await route.GET(as(a.id))).json()).settings.font).toBe("atkinson");
});
