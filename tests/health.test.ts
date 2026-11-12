import { afterEach, expect, test, vi, inject } from "vitest";
import postgres from "postgres";
import { freshDatabase } from "./helpers/db";

afterEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
});

async function loadRoute(url: string) {
  vi.resetModules();
  vi.stubEnv("DATABASE_URL", url);
  return import("@/app/api/v1/health/route");
}

test("migrations are safe to run twice and health returns 200", async () => {
  const url = await freshDatabase(inject("testDatabaseUrl"), "flipside_health");
  vi.stubEnv("DATABASE_URL", url);
  const { runMigrations } = await import("@/server/db/migrate");
  await runMigrations();
  await runMigrations();
  const sql = postgres(url, { max: 1 });
  const [r] = await sql`select count(*)::int as n from public.schema_migrations`;
  await sql.end();
  expect(r.n).toBe(2); // one row per migration, not doubled by the second run

  vi.resetModules();
  const { GET } = await loadRoute(url);
  const res = await GET();
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ status: "ok", checks: { database: "ok" } });
});

test("health returns 503 in the error format when the database is unreachable", async () => {
  const { GET } = await loadRoute("postgres://flipside:flipside@127.0.0.1:1/none");
  const res = await GET();
  expect(res.status).toBe(503);
  const body = await res.json();
  expect(body.error.code).toBe("database_unavailable");
  expect(typeof body.error.message).toBe("string");
  expect(Array.isArray(body.error.details)).toBe(true);
});
