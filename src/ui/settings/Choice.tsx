import type { ReactNode } from "react";
import { FOCUS_RING, PRESSED } from "@/ui/button/button-class";

/** One option in a settings group: a pill that shows as pressed when chosen. */
export function Choice({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`min-h-11 rounded-full px-5 font-semibold ${PRESSED} ${FOCUS_RING} ${
        on
          ? "bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container active:bg-primary-container active:text-on-primary-container"
          : "border border-card-edge bg-surface-card text-on-surface hover:bg-surface-container-high active:bg-surface-container-highest"
      }`}
    >
      {children}
    </button>
  );
}

/** Track and knob for a switch; the button around it carries the role and the text. */
export function SwitchTrack({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 ${on ? "bg-primary" : "bg-outline-variant"}`}
    >
      <span
        className={`size-5 rounded-full bg-surface-card transition-transform ${on ? "translate-x-5" : ""}`}
      />
    </span>
  );
}
