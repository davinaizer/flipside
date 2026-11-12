export const APP_NAME = "Flipside";

/** Default profile timezone; decides what "today" is. */
export const DEFAULT_TIMEZONE = "Europe/London";

/** Hour (profile local time) at which the learning day starts. */
export const DEFAULT_DAY_START_HOUR = 7;

/** Days until due, indexed by box (1 to 5). Box 1 is due again today. */
export const BOX_INTERVALS_DAYS = { 1: 0, 2: 1, 3: 3, 4: 7, 5: 14 } as const;
export const MIN_BOX = 1;
export const MAX_BOX = 5;

/** What Not yet does to a card in box 2 or higher: `reset` to box 1, or `drop_one`. */
export const LAPSE_RULE = "reset" as "reset" | "drop_one";

export const LEECH_THRESHOLD = 8;

/** A Not yet card reappears after about this many other cards. */
export const REQUEUE_GAP = 4;
export const REQUEUE_MAX_PER_SESSION = 2;

export const DEFAULT_NEW_CARDS_PER_DAY = 10;

export const SESSION_LENGTHS = [5, 10, 20, "all"] as const;
export const DEFAULT_SESSION_LENGTH = 5;

/** Each attempt duration is capped at this many seconds for statistics. */
export const DURATION_CAP_SECONDS = 120;

/** The month range on the progress screen is this many Monday-aligned weeks. */
export const STATS_MONTH_WEEKS = 4;
/** Focus next lists this many topics, among topics with at least the minimum cards. */
export const FOCUS_NEXT_COUNT = 3;
export const FOCUS_NEXT_MIN_CARDS = 3;
/** Boxes counted as mastered (Got it segment of the mastery bar). */
export const MASTERED_MIN_BOX = 4;

export const IMPORT_MAX_ROWS = 2000;
export const IMPORT_MAX_ZIP_ENTRIES = 2000;
export const IMPORT_MAX_ZIP_UNCOMPRESSED_BYTES = 200 * 1024 * 1024;

/** Fits Vercel's 4.5 MB request body limit (H5). */
export const IMAGE_MAX_BYTES = 4 * 1024 * 1024;
/** Largest CSV or zip accepted through the web import; bigger files use `pnpm import:cli` (H5). */
export const WEB_IMPORT_MAX_BYTES = 4 * 1024 * 1024;
export const IMAGE_MAX_DIMENSION_PX = 4096;
export const IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;

/** Reading settings (T1). Steps are 1-based like the stored settings; body text never goes under 16 px. */
export const TEXT_SIZE_STEPS = [
  { label: "Small", px: 16 },
  { label: "Medium", px: 18 },
  { label: "Large", px: 22 },
  { label: "Extra large", px: 26 },
] as const;
export const LETTER_SPACING_STEPS = [
  { label: "Normal", em: 0 },
  { label: "Wide", em: 0.05 },
  { label: "Wider", em: 0.1 },
] as const;
export const LINE_SPACING_STEPS = [
  { label: "Normal", lineHeight: 1.4 },
  { label: "Roomy", lineHeight: 1.7 },
  { label: "Extra roomy", lineHeight: 2 },
] as const;
/** The question is set this many times larger than the answer text. */
export const QUESTION_SCALE = 1.5;

/** Display name length limit after trim (P7). */
export const PROFILE_NAME_MAX = 24;

/** Name of the signed sign-in cookie (AG2). */
export const AUTH_COOKIE_NAME = "flipside_auth";
/** How long a sign-in stays valid (AG2). */
export const AUTH_COOKIE_MAX_AGE_DAYS = 30;
export const AUTH_COOKIE_MAX_AGE_SECONDS = AUTH_COOKIE_MAX_AGE_DAYS * 24 * 60 * 60;

/** Name of the sign-in token cookie (AU2). Its lifetime is AUTH_COOKIE_MAX_AGE_SECONDS. */
export const SIGN_IN_COOKIE_NAME = "flipside_sign_in";
/** Random bytes in a sign-in token (AU2). */
export const SIGN_IN_TOKEN_BYTES = 32;
/** Shortest accepted account password (AU3). */
export const PASSWORD_MIN_LENGTH = 12;
/** Failed sign-ins per email within the window before further attempts fail (AU5). */
export const SIGN_IN_MAX_FAILURES = 5;
/** Length of the failure window, and of the lockout that follows it (AU5). */
export const SIGN_IN_WINDOW_MINUTES = 15;
