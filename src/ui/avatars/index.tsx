import { AVATAR_IDS } from "@/shared/avatars";

/** Placeholder avatars (D15): one glyph per id. The final illustrations replace this map only. */
const GLYPHS: Record<(typeof AVATAR_IDS)[number], string> = {
  fox: "🦊",
  owl: "🦉",
  otter: "🦦",
  panda: "🐼",
  koala: "🐨",
  penguin: "🐧",
};

/** Decorative: the profile name next to it is the accessible label. */
export function Avatar({ id, size = 96 }: { id: string; size?: number }) {
  const glyph = (GLYPHS as Record<string, string>)[id] ?? "🙂";
  return (
    <span
      aria-hidden="true"
      className="flex items-center justify-center rounded-full bg-primary-container"
      style={{ width: size, height: size, fontSize: size * 0.55 }}
    >
      {glyph}
    </span>
  );
}
