import { z } from "zod";
import { CARD_COLORS, FONT_IDS, READING_SPEEDS, THEMES } from "./enums";
import { DEFAULT_NEW_CARDS_PER_DAY, DEFAULT_SESSION_LENGTH } from "./constants";

/** Fonts are stored as ids (N5), never CSS stacks. */
export const settingsSchema = z.object({
  theme: z.enum(THEMES).default("light"),
  font: z.enum(FONT_IDS).default("atkinson"),
  textSize: z.number().int().min(1).max(4).default(2),
  letterSpacing: z.number().int().min(1).max(3).default(1),
  lineSpacing: z.number().int().min(1).max(3).default(2),
  cardColor: z.enum(CARD_COLORS).default("mist"),
  cardsPerSession: z
    .union([z.literal(5), z.literal(10), z.literal(20), z.literal("all")])
    .default(DEFAULT_SESSION_LENGTH),
  newCardsPerDay: z.number().int().min(0).max(100).default(DEFAULT_NEW_CARDS_PER_DAY),
  readAloud: z.boolean().default(false),
  readingSpeed: z.enum(READING_SPEEDS).default("normal"),
});

export type Settings = z.infer<typeof settingsSchema>;

export const DEFAULT_SETTINGS: Settings = settingsSchema.parse({});
