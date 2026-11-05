const SWATCH: Record<string, string> = {
  mist: "bg-card-mist text-on-card-mist",
  cream: "bg-card-cream text-on-card-cream",
  peach: "bg-card-peach text-on-card-peach",
  sage: "bg-card-sage text-on-card-sage",
  lavender: "bg-card-lavender text-on-card-lavender",
  night: "bg-card-night text-on-card-night",
};

/** One or two letters for the tile: "Biology" is B, "System Design" is SD. */
export function deckInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? "?")[0]).toUpperCase();
}

/** The deck's colour with its initials. Decorative: the deck name always sits next to it. */
export function DeckTile({
  name,
  color,
  size = 44,
}: {
  name: string;
  color: string | null;
  size?: number;
}) {
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-2xl font-semibold ${SWATCH[color ?? ""] ?? "bg-surface-container-high text-on-surface"}`}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {deckInitials(name)}
    </span>
  );
}
