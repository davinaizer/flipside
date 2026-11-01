import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { expect, test, vi, inject } from "vitest";
import { freshDatabase } from "./helpers/db";

async function setup() {
  const url = await freshDatabase(inject("testDatabaseUrl"), "flipside_profile");
  vi.stubEnv("DATABASE_URL", url);
  const { runMigrations } = await import("@/server/db/migrate");
  const { getDb } = await import("@/server/db/client");
  const db = getDb();
  await runMigrations(db);
  return db;
}

test("cookie and X-Profile-Id resolve a profile; bad ids give 401 in the error format", async () => {
  const db = await setup();
  const { createProfile, createDeck, createCard, createCardState } = await import("./factories");
  const { getCurrentProfile, PROFILE_COOKIE } = await import("@/server/profile");
  const { toErrorResponse } = await import("@/server/http/errors");
  const p = await createProfile(db, { name: "Ada" });

  const byCookie = new Request("http://x/", {
    headers: { cookie: `a=b; ${PROFILE_COOKIE}=${p.id}` },
  });
  expect((await getCurrentProfile(byCookie)).id).toBe(p.id);
  const byHeader = new Request("http://x/", { headers: { "X-Profile-Id": p.id } });
  expect((await getCurrentProfile(byHeader)).name).toBe("Ada");

  const bad = [
    new Request("http://x/"),
    new Request("http://x/", {
      headers: { "X-Profile-Id": "0198f0f0-0000-7000-8000-000000000000" },
    }),
    new Request("http://x/", { headers: { "X-Profile-Id": "not-a-uuid" } }),
    new Request("http://x/", { headers: { cookie: `${PROFILE_COOKIE}=` } }),
  ];
  for (const req of bad) {
    const res = await getCurrentProfile(req).catch(toErrorResponse);
    expect(res).toBeInstanceOf(Response);
    expect((res as Response).status).toBe(401);
    const body = await (res as Response).json();
    expect(body.error.code).toBe("unauthorized");
    expect(Array.isArray(body.error.details)).toBe(true);
  }

  const deck = await createDeck(db, p.id);
  const card = await createCard(db, deck.id);
  const state = await createCardState(db, p.id, card.id, { box: 3 });
  expect(state.box).toBe(3);
});

test("no other module reads flipside_profile", () => {
  const hits: string[] = [];
  const walk = (dir: string) => {
    for (const f of readdirSync(dir)) {
      const full = join(dir, f);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(ts|tsx|mjs)$/.test(f) && readFileSync(full, "utf8").includes("flipside_profile"))
        hits.push(full);
    }
  };
  walk(join(process.cwd(), "src"));
  expect(hits.map((h) => h.replace(process.cwd() + "/", ""))).toEqual(["src/server/profile.ts"]);
});
