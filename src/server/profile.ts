import { eq } from "drizzle-orm";
import type { Db } from "@/server/db/client";
import { getDb } from "@/server/db/client";
import { profiles } from "@/server/db/schema";
import { ApiError } from "@/server/http/errors";
import { DEFAULT_ACCENT } from "@/shared/avatars";
import { DEFAULT_DAY_START_HOUR, DEFAULT_TIMEZONE } from "@/shared/constants";
import { createProfileRequestSchema, updateProfileRequestSchema } from "@/shared/schemas/profile";
import { DEFAULT_SETTINGS, settingsSchema } from "@/shared/settings";

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

/** Picker list: id, name and avatar only (PRD section 11). */
export async function listProfiles(db: Db = getDb()) {
  return db
    .select({ id: profiles.id, name: profiles.name, avatar: profiles.avatar })
    .from(profiles)
    .orderBy(profiles.name);
}

/** Confirms the profile exists before the route sets the cookie. */
export async function requireProfileById(id: string, db: Db = getDb()): Promise<Profile> {
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, id));
  if (!profile) throw new ApiError(404, "profile_not_found", "That profile does not exist.");
  return profile;
}

/** The /me payload; stored settings are completed with defaults. */
export function toMe(profile: Profile) {
  return {
    profile: {
      id: profile.id,
      name: profile.name,
      avatar: profile.avatar,
      accent: profile.accent,
      timezone: profile.timezone,
      dayStartHour: profile.dayStartHour,
    },
    settings: settingsSchema.parse(profile.settings),
  };
}

/**
 * Creates a profile from a name and avatar (P8) with the default timezone, day start hour and
 * settings. Invalid input is a 400 naming the problem. Duplicates are allowed (P4).
 */
export async function createProfile(body: unknown, db: Db = getDb()): Promise<Profile> {
  const parsed = createProfileRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(
      400,
      "validation_failed",
      parsed.error.issues.map((i) => i.message).join(". "),
      parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    );
  }
  const [created] = await db
    .insert(profiles)
    .values({
      ...parsed.data,
      accent: DEFAULT_ACCENT,
      timezone: DEFAULT_TIMEZONE,
      dayStartHour: DEFAULT_DAY_START_HOUR,
      settings: DEFAULT_SETTINGS,
    })
    .returning();
  return created;
}

/**
 * Changes the current profile's avatar and/or name (P7). Invalid input is a 422 whose message
 * names the problem. Duplicate avatars and names are allowed (P4); only this profile's row is touched.
 */
export async function updateProfile(
  profileId: string,
  body: unknown,
  db: Db = getDb(),
): Promise<Profile> {
  const parsed = updateProfileRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(
      422,
      "validation_failed",
      parsed.error.issues.map((i) => i.message).join(". "),
      parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    );
  }
  const [updated] = await db
    .update(profiles)
    .set(parsed.data)
    .where(eq(profiles.id, profileId))
    .returning();
  return updated;
}

/**
 * Where "/" goes: the Library when the cookie names a real profile (unless the picker was
 * asked for with ?switch=1), otherwise the picker. An invalid cookie just shows the picker.
 */
export async function resolveHome(
  cookieValue: string | undefined,
  wantsSwitch: boolean,
  db: Db = getDb(),
): Promise<"library" | "picker"> {
  if (wantsSwitch || !cookieValue) return "picker";
  const req = new Request("http://local/", {
    headers: { cookie: `${PROFILE_COOKIE}=${cookieValue}` },
  });
  return getCurrentProfile(req, db).then(
    () => "library" as const,
    (e: unknown) => {
      if (e instanceof ApiError && e.status === 401) return "picker" as const;
      throw e;
    },
  );
}

/** For server-rendered pages: the profile named by the cookie value, or null when missing or unknown. */
export async function profileFromCookie(
  cookieValue: string | undefined,
  db: Db = getDb(),
): Promise<Profile | null> {
  if (!cookieValue) return null;
  const req = new Request("http://local/", {
    headers: { cookie: `${PROFILE_COOKIE}=${cookieValue}` },
  });
  return getCurrentProfile(req, db).catch((e: unknown) => {
    if (e instanceof ApiError && e.status === 401) return null;
    throw e;
  });
}
