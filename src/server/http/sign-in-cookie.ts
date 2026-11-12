import { SIGN_IN_COOKIE_NAME, SIGN_IN_TOKEN_MAX_AGE_SECONDS } from "@/shared/constants";

/**
 * Secure by protocol, not host name: over plain http (localhost or a LAN IP) browsers such as Safari
 * drop a Secure cookie, so it is set only when the request is https, directly or behind a proxy (AU2, F23.8).
 */
function secureFlag(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
  const https = new URL(request.url).protocol === "https:" || forwarded === "https";
  return https ? "; Secure" : "";
}

/** Set-Cookie value that stores a sign-in token for 30 days (AU2). */
export function signInCookie(request: Request, token: string): string {
  return `${SIGN_IN_COOKIE_NAME}=${token}; Path=/; Max-Age=${SIGN_IN_TOKEN_MAX_AGE_SECONDS}; HttpOnly; SameSite=Lax${secureFlag(request)}`;
}

/** Set-Cookie value that clears the sign-in cookie (AU7). */
export function clearSignInCookie(request: Request): string {
  return `${SIGN_IN_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secureFlag(request)}`;
}
