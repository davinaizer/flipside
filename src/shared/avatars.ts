/** Placeholder avatar registry (D15). Swap the ids here when the final illustrations are chosen. */
export const AVATAR_IDS = ["fox", "owl", "otter", "panda", "koala", "penguin"] as const;
export type AvatarId = (typeof AVATAR_IDS)[number];

/** Profile accent: "primary" means the design primary token. */
export const DEFAULT_ACCENT = "primary";
