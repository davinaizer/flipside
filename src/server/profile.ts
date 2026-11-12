import { eq } from "drizzle-orm";
import type { Db } from "@/server/db/client";
import { getDb } from "@/server/db/client";
import { profiles } from "@/server/db/schema";
import { type CookieJar, readCookie } from "@/server/http/cookies";
import { ApiError } from "@/server/http/errors";
import { parseOrThrow } from "@/server/http/parse";
import { signedInAccount } from "@/server/sign-in";
import { DEFAULT_ACCENT } from "@/shared/avatars";
import { DEFAULT_DAY_START_HOUR, DEFAULT_TIMEZONE } from "@/shared/constants";
import { createProfileRequestSchema, updateProfileRequestSchema } from "@/shared/schemas/profile";
import { DEFAULT_SETTINGS, settingsSchema } from "@/shared/settings";
import { isUuid } from "@/shared/uuid";

/** The only module that knows the cookie name (PRD section 11); others import this constant. */
export const PROFILE_COOKIE = "flipside_profile";
export const PROFILE_HEADER = "x-profile-id";

export type Profile = typeof profiles.$inferSelect;

/** The signed-in account a request or page acts for (AU6). */
export type Account = { id: string; email: string };

/** The one profile lookup: null for a missing, malformed or unknown id. Ids match case-insensitively. */
async function profileById(
  id: string | null | undefined,
  db: Db = getDb(),
): Promise<Profile | null> {
  if (!id || !isUuid(id)) return null;
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, id.toLowerCase()));
  return profile ?? null;
}

/** The profile only when it belongs to the account; another account's profile is null like an unknown one (AU6). */
export async function profileInAccount(
  id: string | null | undefined,
  accountId: string,
  db: Db = getDb(),
): Promise<Profile | null> {
  const profile = await profileById(id, db);
  return profile?.accountId === accountId ? profile : null;
}

/** The account of the request's sign-in token; a missing, expired or revoked token is a 401 (AU6). */
export async function getCurrentAccount(request: Request, db: Db = getDb()): Promise<Account> {
  const account = await signedInAccount(request, db);
  if (!account) throw new ApiError(401, "unauthorized", "Please sign in first.");
  return account;
}

/**
 * Resolves the current profile (AU6, N6): the sign-in token first, then the profile id from
 * the X-Profile-Id header, else the cookie, accepted only if it belongs to the token's account.
 * Anything else throws a 401 ApiError, so a request that slips past the proxy reaches no data.
 * Every service scopes its queries by the returned profile id (another profile's resource is a 404).
 */
export async function getCurrentProfile(request: Request, db: Db = getDb()): Promise<Profile> {
  const account = await getCurrentAccount(request, db);
  const id = request.headers.get(PROFILE_HEADER) ?? readCookie(request, PROFILE_COOKIE);
  const profile = await profileInAccount(id, account.id, db);
  if (!profile) throw new ApiError(401, "unauthorized", "Choose a profile to continue.");
  return profile;
}

/** Picker list of the account's profiles: id, name and avatar only (PRD section 11, AU6). */
export async function listProfiles(accountId: string, db: Db = getDb()) {
  return db
    .select({ id: profiles.id, name: profiles.name, avatar: profiles.avatar })
    .from(profiles)
    .where(eq(profiles.accountId, accountId))
    .orderBy(profiles.name);
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
 * settings, inside the signed-in account (P5, AU6). Invalid input is a 400 naming the problem.
 * Duplicates are allowed (P4).
 */
export async function createProfile(
  accountId: string,
  body: unknown,
  db: Db = getDb(),
): Promise<Profile> {
  const data = parseOrThrow(createProfileRequestSchema, body, {
    status: 400,
    code: "validation_failed",
  });
  const [created] = await db
    .insert(profiles)
    .values({
      ...data,
      accountId,
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
  const data = parseOrThrow(updateProfileRequestSchema, body, {
    status: 422,
    code: "validation_failed",
  });
  const [updated] = await db
    .update(profiles)
    .set(data)
    .where(eq(profiles.id, profileId))
    .returning();
  return updated;
}

/**
 * Where "/" goes: Login when the sign-in token is missing or no longer valid; the Library when
 * the profile cookie names a profile of the signed-in account (unless the picker was asked for
 * with ?switch=1); otherwise the picker. An invalid profile cookie just shows the picker.
 */
export async function resolveHome(
  jar: CookieJar,
  wantsSwitch: boolean,
  db: Db = getDb(),
): Promise<"login" | "library" | "picker"> {
  const account = await signedInAccount(jar, db);
  if (!account) return "login";
  if (wantsSwitch) return "picker";
  return (await profileInAccount(jar.get(PROFILE_COOKIE)?.value, account.id, db))
    ? "library"
    : "picker";
}

/**
 * For server-rendered layouts and pages: the profile named by the profile cookie, verified
 * against the sign-in token like getCurrentProfile (AU6), or null.
 */
export async function profileFromCookies(
  jar: CookieJar,
  db: Db = getDb(),
): Promise<Profile | null> {
  const account = await signedInAccount(jar, db);
  if (!account) return null;
  return profileInAccount(jar.get(PROFILE_COOKIE)?.value, account.id, db);
}
