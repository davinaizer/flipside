import { z } from "zod";
import { AVATAR_IDS } from "../avatars";
import { PROFILE_NAME_MAX } from "../constants";
import { settingsSchema } from "../settings";

export const profileSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  avatar: z.string(),
});
export const profileListSchema = z.object({ profiles: z.array(profileSummarySchema) });

export const selectProfileRequestSchema = z.object({ profileId: z.string().uuid() });

export const meSchema = z.object({
  profile: profileSummarySchema.extend({
    accent: z.string(),
    timezone: z.string(),
    dayStartHour: z.number().int(),
  }),
  settings: settingsSchema,
});

/** PATCH /me body (P7): a new avatar, a new name, or both. Name is trimmed, then 1 to 24 characters. */
export const updateProfileRequestSchema = z
  .object({
    avatar: z.enum(AVATAR_IDS),
    name: z
      .string()
      .trim()
      .min(1, "Name cannot be empty")
      .max(PROFILE_NAME_MAX, `Name must be ${PROFILE_NAME_MAX} characters or fewer`),
  })
  .partial()
  .refine((v) => v.avatar !== undefined || v.name !== undefined, "Nothing to change");

export type ProfileSummary = z.infer<typeof profileSummarySchema>;
export type Me = z.infer<typeof meSchema>;
export type UpdateProfileRequest = z.infer<typeof updateProfileRequestSchema>;
