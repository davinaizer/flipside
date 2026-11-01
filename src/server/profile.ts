import { eq } from "drizzle-orm";
import type { Db } from "@/server/db/client";
import { getDb } from "@/server/db/client";
import { profiles } from "@/server/db/schema";
import { ApiError } from "@/server/http/errors";

/** The only module that knows the cookie name (PRD section 11); others import this constant. */
export const PROFILE_COOKIE = "flipside_profile";
export const PROFILE_HEADER = "x-profile-id";

export type Profile = typeof profiles.$inferSelect;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function readCookie(header: string | null, name: string): string | null {
  for (const part of (header ?? "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return null;
}

/**
 * Resolves the current profile from the X-Profile-Id header, else the cookie.
 * Missing, malformed or unknown ids throw a 401 ApiError. Every service scopes its
 * queries by the returned profile id (another profile's resource is a 404).
 */
export async function getCurrentProfile(request: Request, db: Db = getDb()): Promise<Profile> {
  const id =
    request.headers.get(PROFILE_HEADER) ??
    readCookie(request.headers.get("cookie"), PROFILE_COOKIE);
  const unauthorized = () => new ApiError(401, "unauthorized", "Choose a profile to continue.");
  if (!id || !UUID.test(id)) throw unauthorized();
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, id.toLowerCase()));
  if (!profile) throw unauthorized();
  return profile;
}
