import { eq } from "drizzle-orm";
import type { Db } from "@/server/db/client";
import { getDb } from "@/server/db/client";
import { profiles } from "@/server/db/schema";
import { ApiError } from "@/server/http/errors";
import { settingsSchema, type Settings } from "@/shared/settings";

/** Stored values merged over defaults (the schema fills what is missing). */
export function readSettings(stored: unknown): Settings {
  return settingsSchema.parse(stored);
}

/**
 * Replaces the profile's settings. The body is the full settings object (missing keys take
 * defaults, which also makes "reset to defaults" a PUT of {}); unknown keys are rejected.
 */
export async function saveSettings(
  profileId: string,
  body: unknown,
  db: Db = getDb(),
): Promise<Settings> {
  const parsed = settingsSchema.strict().safeParse(body);
  if (!parsed.success) {
    throw new ApiError(
      400,
      "invalid_request",
      "The settings are not valid.",
      parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    );
  }
  await db.update(profiles).set({ settings: parsed.data }).where(eq(profiles.id, profileId));
  return parsed.data;
}
