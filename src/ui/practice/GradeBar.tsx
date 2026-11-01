import type { ReactNode } from "react";
import type { Grade } from "@/shared/enums";

const GRADE_BUTTONS: { grade: Grade; label: string; icon: ReactNode }[] = [
  { grade: "not_yet", label: "Not yet", icon: <path d="M4 12a8 8 0 1 0 3-6.2M4 4v4h4" /> },
  { grade: "nearly", label: "Nearly", icon: <path d="M5 12h14M12 5v0M12 19v0" /> },
  { grade: "got_it", label: "Got it", icon: <path d="M5 13l4 4L19 7" /> },
];

/** Three grade buttons: icon, label and the scheduler's sublabel, so colour is never the only signal (R4). */
export function GradeBar({
  labels,
  busy,
  failed,
  onGrade,
  onRetry,
}: {
  labels: Record<Grade, string>;
  busy: boolean;
  failed: boolean;
  onGrade: (grade: Grade) => void;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {failed && (
        <p role="alert" className="text-center text-error">
          Your answer was not saved.{" "}
          <button type="button" onClick={onRetry} className="min-h-11 font-semibold underline">
            Try again
          </button>
        </p>
      )}
      <div className="grid grid-cols-3 gap-3">
        {GRADE_BUTTONS.map(({ grade, label, icon }) => (
          <button
            key={grade}
            type="button"
            disabled={busy || failed}
            onClick={() => onGrade(grade)}
            className="flex min-h-20 flex-col items-center justify-center gap-1 rounded-2xl bg-surface-container-high px-2 py-3 text-on-surface disabled:opacity-60"
          >
            <svg aria-hidden viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {icon}
            </svg>
            <span className="font-semibold">{label}</span>
            <span className="text-sm text-on-surface-variant">{labels[grade]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
