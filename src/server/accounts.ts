import { eq, isNull } from "drizzle-orm";
import type { Db } from "@/server/db/client";
import { getDb } from "@/server/db/client";
import { accounts, profiles, signInTokens } from "@/server/db/schema";
import { ApiError } from "@/server/http/errors";
import { hashPassword, verifyPassword } from "@/server/passwords";
import { revokeOtherSignInTokens } from "@/server/sign-in";
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

/**
 * Changes the signed-in account's password (AU8). A wrong current password is the same
 * neutral 401 as a failed sign-in and changes nothing. On success the hash is replaced and
 * every other sign-in token is deleted; the caller's own token stays, so this device remains
 * signed in (setPassword would delete it too, which is right for the CLI but not here).
 */
export async function changePassword(
  accountId: string,
  token: string,
  input: { current: string; new: string; confirm: string },
  db: Db = getDb(),
): Promise<void> {
  const [account] = await db
    .select({ passwordHash: accounts.passwordHash })
    .from(accounts)
    .where(eq(accounts.id, accountId));
  if (!account || !(await verifyPassword(input.current, account.passwordHash))) {
    throw new ApiError(401, "invalid_credentials", "That password did not work. Please try again.");
  }
  checkPassword(input.new);
  if (input.new !== input.confirm) {
    throw new ApiError(400, "invalid_request", "The new password and its confirmation differ.");
  }
  const passwordHash = await hashPassword(input.new);
  await db.transaction(async (tx) => {
    await tx
      .update(accounts)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(accounts.id, accountId));
    await revokeOtherSignInTokens(token, tx);
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
