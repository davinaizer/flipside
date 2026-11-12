import { eq } from "drizzle-orm";
import { expect, test, vi, inject } from "vitest";
import { freshDatabase } from "./helpers/db";

const PASSWORD = "a long enough password";
const answers = (...a: string[]) => {
  const q = [...a];
  return async () => q.shift() ?? "";
};

test("account:create makes a scrypt account, refuses duplicates and short passwords", async () => {
  vi.stubEnv(
    "DATABASE_URL",
    await freshDatabase(inject("testDatabaseUrl"), "flipside_account_cli"),
  );
  const { runMigrations } = await import("@/server/db/migrate");
  const { getDb } = await import("@/server/db/client");
  const { accounts, profiles, signInTokens, decks } = await import("@/server/db/schema");
  const { seedProfiles } = await import("@/server/seed");
  const { runAccountCli } = await import("../scripts/account-cli");
  const db = getDb();
  await runMigrations(db);

  await runAccountCli(["create", "Ada@Example.com"], answers(PASSWORD, PASSWORD), db);
  const [row] = await db.select().from(accounts);
  expect(row.email).toBe("ada@example.com");
  expect(row.passwordHash.startsWith("scrypt$")).toBe(true);

  await expect(
    runAccountCli(["create", "ada@example.com"], answers(PASSWORD, PASSWORD), db),
  ).rejects.toThrow(/already exists/);
  await expect(
    runAccountCli(["create", "b@example.com"], answers("short", "short"), db),
  ).rejects.toThrow(/at least/);
  await expect(
    runAccountCli(["create", "b@example.com"], answers(PASSWORD, "other password!"), db),
  ).rejects.toThrow(/differ/);
  expect(await db.select().from(accounts)).toHaveLength(1);

  // --adopt-profiles: profiles without an account are adopted and keep their decks.
  await seedProfiles(db);
  const [davi] = await db.select().from(profiles).where(eq(profiles.name, "Davi"));
  await db.insert(decks).values({ ownerProfileId: davi.id, name: "Keep me" });
  const msg = await runAccountCli(
    ["create", "home@example.com", "--adopt-profiles"],
    answers(PASSWORD, PASSWORD),
    db,
  );
  expect(msg).toMatch(/adopted 2/);
  const [home] = await db.select().from(accounts).where(eq(accounts.email, "home@example.com"));
  const all = await db.select().from(profiles);
  expect(all.every((p) => p.accountId === home.id)).toBe(true);
  expect(await db.select().from(decks).where(eq(decks.ownerProfileId, davi.id))).toHaveLength(1);

  // account:password changes the hash and revokes tokens.
  await db.insert(signInTokens).values({
    tokenHash: "t1",
    accountId: home.id,
    expiresAt: new Date(Date.now() + 1e6),
  });
  await runAccountCli(
    ["password", "home@example.com"],
    answers("new long password", "new long password"),
    db,
  );
  const [after] = await db.select().from(accounts).where(eq(accounts.id, home.id));
  expect(after.passwordHash).not.toBe(home.passwordHash);
  expect(await db.select().from(signInTokens)).toHaveLength(0);
  await expect(
    runAccountCli(["password", "nobody@example.com"], answers(PASSWORD, PASSWORD), db),
  ).rejects.toThrow(/No account/);
});

test("terminalPrompt prints the question and hides the typed password", async () => {
  const { PassThrough } = await import("node:stream");
  const { terminalPrompt } = await import("../scripts/account-cli");
  const input = Object.assign(new PassThrough(), { isTTY: true, setRawMode: () => input });
  const output = Object.assign(new PassThrough(), { isTTY: true, columns: 80 });
  let written = "";
  output.on("data", (c) => (written += c));
  const answer = terminalPrompt(input, output)("Type the password: ");
  input.write("s3cret-pw\r");
  expect(await answer).toBe("s3cret-pw");
  expect(written).toContain("Type the password: ");
  expect(written).not.toContain("s3cret");
  expect(written.endsWith("\n")).toBe(true);
});
