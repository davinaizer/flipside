import { verifyAuthToken } from "@/server/auth";
import { AUTH_COOKIE_NAME } from "@/shared/constants";
import { errorResponse } from "./errors";

/**
 * The one access check (AG2), applied by src/proxy.ts to every page and /api/v1
 * route. Returns a response to short-circuit with, or null to let the request through.
 */
export function checkAccess(request: Request, password: string, now?: number): Response | null {
  const url = new URL(request.url);
  const { pathname } = url;
  const isApi = pathname === "/api/v1" || pathname.startsWith("/api/v1/");

  // Open on purpose: the health probe, the login endpoint and the login page.
  if (request.method === "GET" && pathname === "/api/v1/health") return null;
  if (request.method === "POST" && pathname === "/api/v1/auth/login") return null;
  if (!isApi && pathname === "/login") return null;

  const cookie = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${AUTH_COOKIE_NAME}=`))
    ?.slice(AUTH_COOKIE_NAME.length + 1);
  if (verifyAuthToken(cookie, password, now)) return null;

  if (isApi) return errorResponse(401, "unauthorized", "Please sign in first.");
  return Response.redirect(new URL("/login", url), 307);
}
