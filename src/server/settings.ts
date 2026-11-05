import { eq } from "drizzle-orm";
import type { Db } from "@/server/db/client";
import { getDb } from "@/server/db/client";
import { profiles } from "@/server/db/schema";
import { parseOrThrow } from "@/server/http/parse";
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
  const data = parseOrThrow(settingsSchema.strict(), body, {
    status: 400,
    code: "invalid_request",
    message: "The settings are not valid.",
  });
  await db.update(profiles).set({ settings: data }).where(eq(profiles.id, profileId));
  return data;
}
