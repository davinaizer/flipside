type Variant = "primary" | "secondary" | "danger";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold disabled:opacity-60 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

// Secondary is the tinted pill from DESIGN.md ("Secondary Tinted"): no border, same size as primary.
const VARIANT: Record<Variant, string> = {
  primary: "bg-primary text-on-primary",
  secondary: "bg-surface-container-high text-primary hover:bg-surface-container-highest",
  danger: "bg-surface-container-high text-error hover:bg-surface-container-highest",
};

/**
 * The one pill-button look for buttons, links and file labels. A class string rather than a
 * component because call sites render <button>, next/link, <a> and <label>. `extra` is for
 * layout only (margin, alignment), never colour or size; `large` is the Show answer size.
 */
export function buttonClass(variant: Variant, opts: { large?: boolean; extra?: string } = {}): string {
  const size = opts.large ? "min-h-14 px-10" : "min-h-11 px-8";
  return `${BASE} ${size} ${VARIANT[variant]} ${opts.extra ?? ""}`.trim();
}
