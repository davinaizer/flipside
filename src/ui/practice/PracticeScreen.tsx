"use client";

import { useEffect, useState } from "react";
import type { SessionResponse } from "@/shared/schemas/session";
import { api } from "@/ui/api/client";
import { useSettings } from "@/ui/settings/SettingsProvider";
import { ErrorState } from "@/ui/states/ErrorState";
import { Skeleton } from "@/ui/states/Skeleton";
import { buttonClass } from "@/ui/button/button-class";
import { Icon } from "@/ui/icons/Icon";
import { ThemeToggle } from "@/ui/settings/ThemeToggle";
import { GradeBar } from "./GradeBar";
import { PracticeView } from "./PracticeView";
import { SummaryScreen } from "./SummaryScreen";
import { SettingsPopover, SettingsShortcut } from "./SettingsPopover";
import { usePracticeShortcuts } from "./shortcuts";
import { useReadAloud } from "./speech";
import { useSession } from "./use-session";

export function PracticeLoading() {
  return (
    <div role="status" aria-label="Loading" className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-72 w-full rounded-3xl" />
    </div>
  );
}

/** Top-right bar holding the theme switch above the summary (practice screens have none, F9.14). */
export function ThemeBar({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="flex justify-end px-6 pt-4 md:px-8">
        <ThemeToggle />
      </div>
      {children}
    </>
  );
}

/** The summary's load error keeps the theme switch; the practice one does not (F9.14). */
export function LoadError({ onRetry, withTheme = false }: { onRetry: () => void; withTheme?: boolean }) {
  const body = (
    <div className="p-8">
      <ErrorState onRetry={onRetry} />
    </div>
  );
  return withTheme ? <ThemeBar>{body}</ThemeBar> : body;
}

export function NoCards({ onEnd }: { onEnd: () => void }) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-8">
      <p>This session has no cards.</p>
      <button type="button" onClick={onEnd} className={buttonClass("secondary", { extra: "self-start" })}>
        End session
      </button>
    </div>
  );
}

/** Loads the session (an empty PUT resumes it); the loaded session is then driven by use-session. Needs a SettingsProvider. */
export function PracticeScreen({ sessionId }: { sessionId: string }) {
  const [data, setData] = useState<SessionResponse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    api.session(sessionId).then(setData, () => setFailed(true));
  }, [sessionId]);
  const retry = () => {
    setFailed(false);
    api.session(sessionId).then(setData, () => setFailed(true));
  };

  if (failed) return <LoadError onRetry={retry} />;
  if (!data) return <PracticeLoading />;
  return <ActiveSession data={data} />;
}

function ActiveSession({ data }: { data: SessionResponse }) {
  const { settings } = useSettings();
  const [left, setLeft] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { view, controller } = useSession(data, () => setLeft(true));
  const { card, labels } = view;
  const reader = useReadAloud(card?.cardId, card?.front, settings.readAloud && !view.revealed, settings.readingSpeed);
  usePracticeShortcuts(
    { revealed: view.revealed, dialogOpen: settingsOpen },
    { reveal: controller.reveal, grade: (g) => void controller.grade(g) },
  );

  // A finished, ended or left session shows its summary; the server completes it on the last grade.
  if (left || view.finished || data.session.endedAt) return <SummaryScreen sessionId={data.session.id} />;

  const undo = (
    <button type="button" disabled={!view.canUndo || view.busy || view.failed} onClick={() => void controller.undo()} className={buttonClass("secondary", { extra: "self-center" })}>
      <Icon name="undo" />
      Undo last
    </button>
  );

  if (!card || !labels) {
    return <NoCards onEnd={() => controller.end()} />;
  }
  return (
    <>
    <PracticeView
      onEnd={() => controller.end()}
      headerAction={<SettingsShortcut onOpen={() => setSettingsOpen(true)} />}
      card={card}
      revealed={view.revealed}
      done={view.done}
      total={view.total}
      settings={settings}
      onReveal={() => controller.reveal()}
      reader={reader}
      footer={
        <>
          {view.revealed && (
            <GradeBar labels={labels} busy={view.busy} failed={view.failed} onGrade={(g) => void controller.grade(g)} onRetry={() => void controller.retry()} />
          )}
          {undo}
        </>
      }
    />
    {settingsOpen && <SettingsPopover onClose={() => setSettingsOpen(false)} />}
    </>
  );
}
