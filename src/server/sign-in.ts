import { createHash, randomBytes } from "node:crypto";
import { and, count, eq, gt, lte, ne, sql } from "drizzle-orm";
import type { Db } from "@/server/db/client";
import { getDb } from "@/server/db/client";
import { accounts, signInAttempts, signInTokens } from "@/server/db/schema";
import { type CookieJar, readCookie } from "@/server/http/cookies";
import { hashPassword, verifyPassword } from "@/server/passwords";
import { emailSchema } from "@/shared/schemas/auth";
import {
  SIGN_IN_TOKEN_MAX_AGE_SECONDS,
  SIGN_IN_COOKIE_NAME,
  SIGN_IN_MAX_FAILURES,
  SIGN_IN_TOKEN_BYTES,
  SIGN_IN_WINDOW_MINUTES,
} from "@/shared/constants";

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
  const expiresAt = new Date(now.getTime() + SIGN_IN_TOKEN_MAX_AGE_SECONDS * 1000);
  await db.transaction(async (tx) => {
    await tx
      .delete(signInTokens)
      .where(and(eq(signInTokens.accountId, accountId), lte(signInTokens.expiresAt, now)));
    await tx.insert(signInTokens).values({ accountId, tokenHash: hashToken(token), expiresAt });
  });
  return { token, expiresAt };
}

/**
 * The raw sign-in token in a request's cookie header or a page's cookie jar, or null.
 * The one reader of `flipside_sign_in` (PRD section 9); src/proxy.ts only checks that it is present.
 */
export function readSignInToken(source: Request | CookieJar): string | null {
  return readCookie(source, SIGN_IN_COOKIE_NAME) || null;
}

/**
 * The signed-in account of a request or page: its sign-in token resolved, or null for a
 * missing, unknown, expired or revoked token (AU6).
 */
export async function signedInAccount(
  source: Request | CookieJar,
  db: Db = getDb(),
  now: Date = new Date(),
): Promise<{ id: string; email: string } | null> {
  const token = readSignInToken(source);
  return token ? resolveSignInToken(token, db, now) : null;
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

// A real scrypt hash of a random password, made once per process. Verifying against it
// when the email is unknown or malformed costs the same as a real check, so the response
// time does not reveal which emails have an account (AU1).
let dummyHash: Promise<string> | undefined;
function getDummyHash(): Promise<string> {
  return (dummyHash ??= hashPassword(randomBytes(SIGN_IN_TOKEN_BYTES).toString("base64url")));
}

/**
 * Signs in with an email and password (AU1, AU5). Returns a new sign-in token, or null
 * for every failure: malformed email, unknown email, wrong password or rate limit. The
 * caller cannot tell them apart, by value or by timing (a scrypt verify always runs).
 *
 * Rate limit: SIGN_IN_MAX_FAILURES failed attempts for the email within
 * SIGN_IN_WINDOW_MINUTES block it, even with the right password. A blocked attempt is not
 * recorded, so the block lifts once those failures leave the window. Attempts older than
 * the window are deleted here, on the next attempt for that email.
 */
export async function signIn(
  email: string,
  password: string,
  db: Db = getDb(),
  now: Date = new Date(),
): Promise<{ token: string; expiresAt: Date } | null> {
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) {
    await verifyPassword(password, await getDummyHash());
    return null;
  }
  const normalised = parsed.data;
  const windowStart = new Date(now.getTime() - SIGN_IN_WINDOW_MINUTES * 60 * 1000);

  // One transaction per email, serialised by an advisory lock on the email: a parallel
  // request for the same email waits here until this one has recorded its attempt, so a
  // burst cannot all read the count before any insert (AU5, across serverless instances).
  // The scrypt verify runs inside on every path, blocked ones too, so timing stays neutral.
  const accountId = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${normalised}))`);
    await tx
      .delete(signInAttempts)
      .where(
        and(eq(signInAttempts.email, normalised), lte(signInAttempts.attemptedAt, windowStart)),
      );
    const [{ failures }] = await tx
      .select({ failures: count() })
      .from(signInAttempts)
      .where(
        and(
          eq(signInAttempts.email, normalised),
          eq(signInAttempts.succeeded, false),
          gt(signInAttempts.attemptedAt, windowStart),
        ),
      );

    const [account] = await tx
      .select({ id: accounts.id, passwordHash: accounts.passwordHash })
      .from(accounts)
      .where(eq(accounts.email, normalised));
    const matches = await verifyPassword(password, account?.passwordHash ?? (await getDummyHash()));

    if (failures >= SIGN_IN_MAX_FAILURES) return null;
    const succeeded = Boolean(account) && matches;
    await tx.insert(signInAttempts).values({ email: normalised, succeeded, attemptedAt: now });
    return account && succeeded ? account.id : null;
  });
  if (!accountId) return null;
  // Issued after the commit: with one connection per instance (H1) a second transaction
  // opened inside the first would wait for a connection that never frees.
  return issueSignInToken(accountId, db, now);
}
