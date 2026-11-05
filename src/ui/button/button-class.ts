type Variant = "primary" | "secondary" | "danger";

// Focus ring and pressed feedback shared by buttons and tappable cards. The pressed shrink is a
// motion, so motion-reduce puts the scale back to 100 and leaves only the colour change.
export const FOCUS_RING =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
export const PRESSED = "active:scale-[0.98] motion-reduce:active:scale-100";

/** Hover, pressed and focus classes for a card that is itself a button (profile tile, switch row). */
export const TAPPABLE_CARD = `hover:bg-surface-container-low active:bg-surface-container ${PRESSED} ${FOCUS_RING}`;

const BASE = `inline-flex items-center justify-center gap-2 rounded-full font-semibold disabled:opacity-60 ${PRESSED} ${FOCUS_RING}`;

// Secondary is the tinted pill from DESIGN.md ("Secondary Tinted"): no border, same size as primary.
const VARIANT: Record<Variant, string> = {
  primary:
    "bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container active:bg-primary-container active:text-on-primary-container",
  secondary:
    "bg-surface-container-high text-primary hover:bg-surface-container-highest active:bg-surface-container-highest",
  danger:
    "bg-surface-container-high text-error hover:bg-surface-container-highest active:bg-surface-container-highest",
};

const SIZE = {
  default: "min-h-11 px-8",
  compact: "min-h-11 px-4",
  large: "min-h-14 px-10",
} as const;

/**
 * The one pill-button look for buttons, links and file labels. A class string rather than a
 * component because call sites render <button>, next/link, <a> and <label>. `extra` is for
 * layout only (margin, alignment), never colour or size: Tailwind cannot be relied on to pick
 * between two padding classes, so size is its own option.
 */
export function buttonClass(
  variant: Variant,
  opts: { size?: keyof typeof SIZE; extra?: string } = {},
): string {
  return `${BASE} ${SIZE[opts.size ?? "default"]} ${VARIANT[variant]} ${opts.extra ?? ""}`.trim();
}
