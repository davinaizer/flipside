import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { AUTH_COOKIE_MAX_AGE_SECONDS } from "@/shared/constants";

/**
 * Shared-password gate (AG1, AG2). Pure functions over node:crypto: the caller
 * passes the password (from env) and, in tests, the clock.
 * Token format: `<expiresAtMs>.<hex HMAC-SHA256 of expiresAtMs>`.
 * The signing key is derived from the password, so changing it invalidates every token.
 */

function signingKey(password: string): Buffer {
  return createHash("sha256").update(`flipside-auth-v1:${password}`).digest();
}

function sign(expiresAt: string, password: string): string {
  return createHmac("sha256", signingKey(password)).update(expiresAt).digest("hex");
}

/** Constant-time compare of two strings; hashing first equalises their lengths. */
function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function checkPassword(candidate: string, password: string): boolean {
  return safeEqual(candidate, password);
}

export function signAuthToken(password: string, now: number = Date.now()): string {
  const expiresAt = String(now + AUTH_COOKIE_MAX_AGE_SECONDS * 1000);
  return `${expiresAt}.${sign(expiresAt, password)}`;
}

export function verifyAuthToken(
  token: string | undefined,
  password: string,
  now: number = Date.now(),
): boolean {
  if (!token) return false;
  const [expiresAt, signature, ...rest] = token.split(".");
  if (!expiresAt || !signature || rest.length > 0 || !/^\d+$/.test(expiresAt)) return false;
  if (!safeEqual(signature, sign(expiresAt, password))) return false;
  return Number(expiresAt) > now;
}
