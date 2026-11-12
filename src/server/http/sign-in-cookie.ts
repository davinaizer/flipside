import { SIGN_IN_COOKIE_NAME, SIGN_IN_TOKEN_MAX_AGE_SECONDS } from "@/shared/constants";

const LOCAL_HOSTS = ["localhost", "127.0.0.1", "[::1]"];

/** Secure everywhere except plain HTTP on localhost, where browsers would drop it (AU2). */
function secureFlag(request: Request): string {
  const { protocol, hostname } = new URL(request.url);
  return protocol === "http:" && LOCAL_HOSTS.includes(hostname) ? "" : "; Secure";
}

/** Set-Cookie value that stores a sign-in token for 30 days (AU2). */
export function signInCookie(request: Request, token: string): string {
  return `${SIGN_IN_COOKIE_NAME}=${token}; Path=/; Max-Age=${SIGN_IN_TOKEN_MAX_AGE_SECONDS}; HttpOnly; SameSite=Lax${secureFlag(request)}`;
}

/** Set-Cookie value that clears the sign-in cookie (AU7). */
export function clearSignInCookie(request: Request): string {
  return `${SIGN_IN_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secureFlag(request)}`;
}
