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

test("cookie and X-Profile-Id resolve a profile of the signed-in account; bad ids give 401 in the error format", async () => {
  const db = await setup();
  const { createProfile, createDeck, createCard, createCardState, asProfile, signedInCookie } =
    await import("./factories");
  const { getCurrentProfile, PROFILE_COOKIE } = await import("@/server/profile");
  const { toErrorResponse } = await import("@/server/http/errors");
  const p = await createProfile(db, { name: "Ada" });

  const byCookie = new Request("http://x/", {
    headers: { cookie: `a=b; ${signedInCookie(p.id)}` },
  });
  expect((await getCurrentProfile(byCookie)).id).toBe(p.id);

  // Pages read a cookie jar; the same token check applies (AU6).
  const jar = (values: Record<string, string>) => ({
    get: (name: string) => (name in values ? { value: values[name] } : undefined),
  });
  const signed = (profile?: string) =>
    jar({
      flipside_sign_in: "test-sign-in-token",
      ...(profile ? { [PROFILE_COOKIE]: profile } : {}),
    });
  const { resolveHome, profileFromCookies } = await import("@/server/profile");
  expect(await resolveHome(signed(p.id), false)).toBe("library");
  expect((await profileFromCookies(signed(p.id)))?.name).toBe("Ada");
  expect(await profileFromCookies(signed())).toBeNull();
  expect(await profileFromCookies(signed("nope"))).toBeNull();
  expect(await profileFromCookies(signed("00000000-0000-4000-8000-000000000000"))).toBeNull();
  expect(await profileFromCookies(jar({ [PROFILE_COOKIE]: p.id }))).toBeNull();
  expect(await resolveHome(signed(p.id), true)).toBe("picker");
  expect(await resolveHome(signed(), false)).toBe("picker");
  expect(await resolveHome(signed("garbage"), false)).toBe("picker");
  expect(await resolveHome(signed("0198f0f0-0000-7000-8000-000000000000"), false)).toBe("picker");
  expect(await resolveHome(jar({ [PROFILE_COOKIE]: p.id }), false)).toBe("login");
  expect(
    await resolveHome(jar({ flipside_sign_in: "revoked", [PROFILE_COOKIE]: p.id }), false),
  ).toBe("login");

  const byHeader = new Request("http://x/", { headers: asProfile(p.id) });
  expect((await getCurrentProfile(byHeader)).name).toBe("Ada");

  const bad = [
    new Request("http://x/"),
    new Request("http://x/", { headers: asProfile("0198f0f0-0000-7000-8000-000000000000") }),
    new Request("http://x/", { headers: asProfile("not-a-uuid") }),
    new Request("http://x/", { headers: { cookie: `${signedInCookie("")}` } }),
    // A valid profile id without a sign-in token (AU6).
    new Request("http://x/", { headers: { "X-Profile-Id": p.id } }),
    new Request("http://x/", { headers: { cookie: `${PROFILE_COOKIE}=${p.id}` } }),
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

test("only src/server/sign-in.ts reads flipside_sign_in; the proxy and cookie writers only name it", () => {
  const hits: string[] = [];
  const walk = (dir: string) => {
    for (const f of readdirSync(dir)) {
      const full = join(dir, f);
      if (statSync(full).isDirectory()) walk(full);
      else if (
        /\.(ts|tsx|mjs)$/.test(f) &&
        !/\.test\.tsx?$/.test(f) &&
        /flipside_sign_in|SIGN_IN_COOKIE_NAME/.test(readFileSync(full, "utf8"))
      )
        hits.push(full.replace(process.cwd() + "/", ""));
    }
  };
  walk(join(process.cwd(), "src"));
  expect(hits.sort()).toEqual([
    "src/server/http/access.ts",
    "src/server/http/sign-in-cookie.ts",
    "src/server/sign-in.ts",
    "src/shared/constants.ts",
  ]);
});
