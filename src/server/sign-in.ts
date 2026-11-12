import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, lte, ne } from "drizzle-orm";
import type { Db } from "@/server/db/client";
import { getDb } from "@/server/db/client";
import { accounts, signInTokens } from "@/server/db/schema";
import { AUTH_COOKIE_MAX_AGE_SECONDS, SIGN_IN_TOKEN_BYTES } from "@/shared/constants";

// Sign-in tokens (AU2, AU7). The raw token lives only in the device's cookie; the
// database holds its SHA-256 hash, so a leaked table cannot be replayed as a cookie.

/** SHA-256 of the cookie token, hex encoded: the only form the database stores. */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Issues a sign-in token for the account and returns the raw value for the cookie
 * (base64url, cookie-safe). Deletes the account's expired tokens first (AU7).
 */
export async function issueSignInToken(
  accountId: string,
  db: Db = getDb(),
  now: Date = new Date(),
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(SIGN_IN_TOKEN_BYTES).toString("base64url");
  const expiresAt = new Date(now.getTime() + AUTH_COOKIE_MAX_AGE_SECONDS * 1000);
  await db.transaction(async (tx) => {
    await tx
      .delete(signInTokens)
      .where(and(eq(signInTokens.accountId, accountId), lte(signInTokens.expiresAt, now)));
    await tx.insert(signInTokens).values({ accountId, tokenHash: hashToken(token), expiresAt });
  });
  return { token, expiresAt };
}

/** The account a token belongs to, or null for an unknown, expired or revoked token. */
export async function resolveSignInToken(
  token: string,
  db: Db = getDb(),
  now: Date = new Date(),
): Promise<{ id: string; email: string } | null> {
  if (!token) return null;
  const [row] = await db
    .select({ id: accounts.id, email: accounts.email })
    .from(signInTokens)
    .innerJoin(accounts, eq(accounts.id, signInTokens.accountId))
    .where(and(eq(signInTokens.tokenHash, hashToken(token)), gt(signInTokens.expiresAt, now)));
  return row ?? null;
}

/** Deletes the token's row (log out, AU7). Unknown tokens are ignored. */
export async function revokeSignInToken(token: string, db: Db = getDb()): Promise<void> {
  await db.delete(signInTokens).where(eq(signInTokens.tokenHash, hashToken(token)));
}

/**
 * Deletes every other sign-in token of the token's account and keeps this one
 * (password change, AU8). Does nothing for an unknown token.
 */
export async function revokeOtherSignInTokens(token: string, db: Db = getDb()): Promise<void> {
  const tokenHash = hashToken(token);
  const [own] = await db
    .select({ accountId: signInTokens.accountId })
    .from(signInTokens)
    .where(eq(signInTokens.tokenHash, tokenHash));
  if (!own) return;
  await db
    .delete(signInTokens)
    .where(and(eq(signInTokens.accountId, own.accountId), ne(signInTokens.tokenHash, tokenHash)));
}
