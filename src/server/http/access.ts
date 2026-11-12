import { SIGN_IN_COOKIE_NAME } from "@/shared/constants";
import { errorResponse } from "./errors";

/**
 * The one presence check (AU1), applied by src/proxy.ts to every page and /api/v1
 * route. It only looks for the sign-in cookie, so it needs no database call; the token
 * itself is verified where data is read (PRD section 9). Returns a response to
 * short-circuit with, or null to let the request through.
 */
export function checkAccess(request: Request): Response | null {
  const url = new URL(request.url);
  const { pathname } = url;
  const isApi = pathname === "/api/v1" || pathname.startsWith("/api/v1/");

  // Open on purpose: the health probe, the login endpoint and the login page.
  if (request.method === "GET" && pathname === "/api/v1/health") return null;
  if (request.method === "POST" && pathname === "/api/v1/auth/login") return null;
  if (!isApi && pathname === "/login") return null;
  // App icons are fetched by the browser and iOS without the cookie (F23.1).
  if (request.method === "GET" && (pathname === "/apple-icon" || pathname.startsWith("/icon/")))
    return null;

  const hasCookie = request.headers
    .get("cookie")
    ?.split(";")
    .some((part) => {
      const [name, ...value] = part.trim().split("=");
      return name === SIGN_IN_COOKIE_NAME && value.join("") !== "";
    });
  if (hasCookie) return null;

  if (isApi) return errorResponse(401, "unauthorized", "Please sign in first.");
  return Response.redirect(new URL("/login", url), 307);
}
