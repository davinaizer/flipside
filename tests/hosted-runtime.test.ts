import { afterEach, describe, expect, it, vi } from "vitest";

type Cfg = { dbCredentials: { url: string } };
const runMigrations = vi.fn();
vi.mock("@/server/db/migrate", () => ({ runMigrations }));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  runMigrations.mockClear();
});

describe("clientOptions", () => {
  it("limits to one connection on Vercel and keeps the default otherwise", async () => {
    const { clientOptions } = await import("@/server/db/client");
    expect(clientOptions({ VERCEL: "1" })).toEqual({ max: 1 });
    expect(clientOptions({})).toEqual({});
  });
});

describe("register", () => {
  it("runs migrations when VERCEL is unset", async () => {
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("DATABASE_URL", "postgres://x");
    const { register } = await import("@/instrumentation");
    await register();
    expect(runMigrations).toHaveBeenCalledOnce();
  });

  it("skips migrations when VERCEL is set", async () => {
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("DATABASE_URL", "postgres://x");
    const { register } = await import("@/instrumentation");
    await register();
    expect(runMigrations).not.toHaveBeenCalled();
  });
});

describe("register env check", () => {
  it("throws on Vercel when the env is invalid", async () => {
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("DATABASE_URL", "");
    const { register } = await import("@/instrumentation");
    await expect(register()).rejects.toThrow();
    expect(runMigrations).not.toHaveBeenCalled();
  });
});

describe("drizzle.config", () => {
  it("prefers DATABASE_URL_UNPOOLED, else DATABASE_URL", async () => {
    vi.stubEnv("DATABASE_URL", "postgres://pooled/db");
    vi.stubEnv("DATABASE_URL_UNPOOLED", "postgres://direct/db");
    let cfg = (await import("../drizzle.config")).default as unknown as Cfg;
    expect(cfg.dbCredentials).toEqual({ url: "postgres://direct/db" });
    vi.resetModules();
    vi.stubEnv("DATABASE_URL_UNPOOLED", "");
    cfg = (await import("../drizzle.config")).default as unknown as Cfg;
    expect(cfg.dbCredentials).toEqual({ url: "postgres://pooled/db" });
  });
});
