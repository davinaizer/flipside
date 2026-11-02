import type { FontId } from "@/shared/enums";

/** CSS variables set on <html> by next/font/local in the root layout. */
export const FONT_VARIABLES = {
  atkinson: "--font-atkinson",
  lexend: "--font-lexend",
} as const;

const SYSTEM_STACK = "ui-sans-serif, system-ui, sans-serif";

/** Maps a stored font id (settings) to the CSS font-family value for card text. */
export const FONT_FAMILY: Record<FontId, string> = {
  atkinson: `var(${FONT_VARIABLES.atkinson})`,
  lexend: `var(${FONT_VARIABLES.lexend})`,
  system: SYSTEM_STACK,
};

export const DEFAULT_BODY_FONT: FontId = "atkinson";
export const HEADING_FONT_VARIABLE = FONT_VARIABLES.lexend;
