import { eq } from "drizzle-orm";
import type { Db } from "@/server/db/client";
import { profiles } from "@/server/db/schema";
import { AVATAR_IDS, DEFAULT_ACCENT } from "@/shared/avatars";
import { DEFAULT_DAY_START_HOUR, DEFAULT_TIMEZONE } from "@/shared/constants";
import { DEFAULT_SETTINGS } from "@/shared/settings";

export const SEED_PROFILES = [
  { name: "Davi", avatar: AVATAR_IDS[0] },
  { name: "Nicole", avatar: AVATAR_IDS[1] },
] as const;

/** Inserts the seed profiles that are missing, matched by name. Safe to run repeatedly. */
export async function seedProfiles(db: Db): Promise<void> {
  for (const p of SEED_PROFILES) {
    const [existing] = await db
      .select({ id: profiles.id, avatar: profiles.avatar })
      .from(profiles)
      .where(eq(profiles.name, p.name))
      .limit(1);
    if (existing) {
      // Repair a row left with an avatar id from the retired emoji set, so it shows an illustration.
      if (!(AVATAR_IDS as readonly string[]).includes(existing.avatar)) {
        await db.update(profiles).set({ avatar: p.avatar }).where(eq(profiles.id, existing.id));
      }
      continue;
    }
    await db.insert(profiles).values({
      name: p.name,
      avatar: p.avatar,
      accent: DEFAULT_ACCENT,
      timezone: DEFAULT_TIMEZONE,
      dayStartHour: DEFAULT_DAY_START_HOUR,
      settings: DEFAULT_SETTINGS,
    });
  }
}
