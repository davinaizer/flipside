"use client";

import { useEffect, useState } from "react";
import type { SessionResponse } from "@/shared/schemas/session";
import { api } from "@/ui/api/client";
import type { ReadingSettings } from "@/ui/reading-card/ReadingCard";
import { ErrorState } from "@/ui/states/ErrorState";
import { Skeleton } from "@/ui/states/Skeleton";
import { GradeBar } from "./GradeBar";
import { PracticeView } from "./PracticeView";
import { SummaryScreen } from "./SummaryScreen";
import { useSession } from "./use-session";

export function PracticeLoading() {
  return (
    <div role="status" aria-label="Loading" className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-72 w-full rounded-3xl" />
    </div>
  );
}

/** Loads the session (an empty PUT resumes it); the loaded session is then driven by use-session. */
export function PracticeScreen({ sessionId, settings }: { sessionId: string; settings: ReadingSettings }) {
  const [data, setData] = useState<SessionResponse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    api.session(sessionId).then(setData, () => setFailed(true));
  }, [sessionId]);
  const retry = () => {
    setFailed(false);
    api.session(sessionId).then(setData, () => setFailed(true));
  };

  if (failed) return <div className="p-8"><ErrorState onRetry={retry} /></div>;
  if (!data) return <PracticeLoading />;
  return <ActiveSession data={data} settings={settings} />;
}

function ActiveSession({ data, settings }: { data: SessionResponse; settings: ReadingSettings }) {
  const [left, setLeft] = useState(false);
  const { view, controller } = useSession(data, () => setLeft(true));
  const { card, labels } = view;

  // A finished, ended or left session shows its summary; the server completes it on the last grade.
  if (left || view.finished || data.session.endedAt) return <SummaryScreen sessionId={data.session.id} />;

  const controls = (
    <div className="flex justify-between">
      <button type="button" disabled={!view.canUndo || view.busy || view.failed} onClick={() => void controller.undo()} className="min-h-11 px-4 text-on-surface-variant underline disabled:opacity-50">
        Undo last
      </button>
      <button type="button" onClick={() => controller.end()} className="min-h-11 px-4 text-on-surface-variant underline">
        End session
      </button>
    </div>
  );

  if (!card || !labels) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-8">
        <p>This session has no cards.</p>
        {controls}
      </div>
    );
  }
  return (
    <PracticeView
      card={card}
      revealed={view.revealed}
      done={view.done}
      total={view.total}
      settings={settings}
      onReveal={() => controller.reveal()}
      footer={
        <>
          {view.revealed && (
            <GradeBar labels={labels} busy={view.busy} failed={view.failed} onGrade={(g) => void controller.grade(g)} onRetry={() => void controller.retry()} />
          )}
          {controls}
        </>
      }
    />
  );
}
