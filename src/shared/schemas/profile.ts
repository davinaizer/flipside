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

/** The one name rule (P8): trimmed, 1 to 24 characters. The Profile forms reuse it. */
export const profileNameSchema = z
  .string()
  .trim()
  .min(1, "Name cannot be empty")
  .max(PROFILE_NAME_MAX, `Name must be ${PROFILE_NAME_MAX} characters or fewer`);

const profileFields = { avatar: z.enum(AVATAR_IDS), name: profileNameSchema };

/** POST /profiles body (P8): both fields required; name is trimmed, then 1 to 24 characters. */
export const createProfileRequestSchema = z.object(profileFields);

/** PATCH /me body (P7): a new avatar, a new name, or both. */
export const updateProfileRequestSchema = z
  .object(profileFields)
  .partial()
  .refine((v) => v.avatar !== undefined || v.name !== undefined, "Nothing to change");

export type ProfileSummary = z.infer<typeof profileSummarySchema>;
export type Me = z.infer<typeof meSchema>;
export type CreateProfileRequest = z.infer<typeof createProfileRequestSchema>;
export type UpdateProfileRequest = z.infer<typeof updateProfileRequestSchema>;
