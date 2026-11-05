import { FOCUS_RING, PRESSED } from "@/ui/button/button-class";
import { Icon, type IconName } from "@/ui/icons/Icon";
import type { Grade } from "@/shared/enums";

/** Tint per grade, from the box tokens (README item 9: labels are darkened there, not here). */
export const GRADE_TONE: Record<Grade, string> = {
  not_yet: "bg-box-not-yet text-on-box-not-yet",
  nearly: "bg-box-nearly text-on-box-nearly",
  got_it: "bg-box-got-it text-on-box-got-it",
};

const GRADE_PROMPT = "How well did you know this?";

const GRADE_BUTTONS: { grade: Grade; label: string; icon: IconName }[] = [
  { grade: "not_yet", label: "Not yet", icon: "refresh" },
  { grade: "nearly", label: "Nearly", icon: "trend" },
  { grade: "got_it", label: "Got it", icon: "checkCircle" },
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
          <button
            type="button"
            onClick={onRetry}
            className={`min-h-11 rounded-full px-2 font-semibold underline hover:bg-surface-container-high active:bg-surface-container-highest ${PRESSED} ${FOCUS_RING}`}
          >
            Try again
          </button>
        </p>
      )}
      <p id="grade-prompt" className="text-center text-body-lg font-semibold text-on-surface">
        {GRADE_PROMPT}
      </p>
      <div role="group" aria-labelledby="grade-prompt" className="grid grid-cols-3 gap-3">
        {GRADE_BUTTONS.map(({ grade, label, icon }) => (
          <button
            key={grade}
            type="button"
            disabled={busy || failed}
            onClick={() => onGrade(grade)}
            className={`flex min-h-20 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-3 ${GRADE_TONE[grade]} hover:brightness-95 active:brightness-90 ${PRESSED} ${FOCUS_RING} disabled:opacity-60`}
          >
            <Icon name={icon} size={24} />
            <span className="text-body-lg font-semibold">{label}</span>
            <span className="text-sm">{labels[grade]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
