import { z } from "zod";
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

export type ProfileSummary = z.infer<typeof profileSummarySchema>;
export type Me = z.infer<typeof meSchema>;
