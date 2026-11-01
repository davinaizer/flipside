export const GRADES = ["not_yet", "nearly", "got_it"] as const;
export type Grade = (typeof GRADES)[number];

export const CARD_STATUSES = ["active", "leech", "suspended"] as const;
export type CardStatus = (typeof CARD_STATUSES)[number];

export const ANSWER_STYLES = ["paragraph", "bullets"] as const;
export type AnswerStyle = (typeof ANSWER_STYLES)[number];

export const ENDED_REASONS = ["completed", "ended_early"] as const;
export type EndedReason = (typeof ENDED_REASONS)[number];

export const THEMES = ["light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

export const FONT_IDS = ["atkinson", "lexend", "system"] as const;
export type FontId = (typeof FONT_IDS)[number];

export const CARD_COLORS = ["mist", "cream", "peach", "sage", "lavender", "night"] as const;
export type CardColor = (typeof CARD_COLORS)[number];

export const READING_SPEEDS = ["slow", "normal", "fast"] as const;
export type ReadingSpeed = (typeof READING_SPEEDS)[number];
