import { eq, isNull } from "drizzle-orm";
import type { Db } from "@/server/db/client";
import { getDb } from "@/server/db/client";
import { accounts, profiles, signInTokens } from "@/server/db/schema";
import { ApiError } from "@/server/http/errors";
import { hashPassword } from "@/server/passwords";
import { emailSchema, newPasswordSchema } from "@/shared/schemas/auth";
import { PASSWORD_MIN_LENGTH } from "@/shared/constants";

function checkPassword(password: string) {
  if (!newPasswordSchema.safeParse(password).success) {
    throw new ApiError(
      400,
      "invalid_request",
      `The password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
    );
  }
}

/** Creates an account (AU4). Only the CLI calls this: there is no sign-up endpoint. */
export async function createAccount(
  email: string,
  password: string,
  db: Db = getDb(),
): Promise<{ id: string; email: string }> {
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) throw new ApiError(400, "invalid_request", "The email is not valid.");
  checkPassword(password);
  const passwordHash = await hashPassword(password);
  const [row] = await db
    .insert(accounts)
    .values({ email: parsed.data, passwordHash })
    .onConflictDoNothing({ target: accounts.email })
    .returning({ id: accounts.id, email: accounts.email });
  if (!row) throw new ApiError(409, "email_taken", "An account with this email already exists.");
  return row;
}

/** Stores a new hash and revokes every sign-in token of the account (AU4). */
export async function setPassword(
  accountId: string,
  password: string,
  db: Db = getDb(),
): Promise<void> {
  checkPassword(password);
  const passwordHash = await hashPassword(password);
  await db.transaction(async (tx) => {
    await tx
      .update(accounts)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(accounts.id, accountId));
    await tx.delete(signInTokens).where(eq(signInTokens.accountId, accountId));
  });
}

/** Finds an account by email (trimmed and lower-cased like createAccount); null when none. */
export async function findAccountId(email: string, db: Db = getDb()): Promise<string | null> {
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) return null;
  const [row] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(eq(accounts.email, parsed.data));
  return row?.id ?? null;
}

/** Gives every profile without an account to this one, keeping their decks and progress (AU6). */
export async function adoptProfiles(accountId: string, db: Db = getDb()): Promise<number> {
  const rows = await db
    .update(profiles)
    .set({ accountId })
    .where(isNull(profiles.accountId))
    .returning({ id: profiles.id });
  return rows.length;
}
