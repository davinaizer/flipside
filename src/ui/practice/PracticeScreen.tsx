"use client";

import { useEffect, useState } from "react";
import type { SessionResponse } from "@/shared/schemas/session";
import { api } from "@/ui/api/client";
import type { ReadingSettings } from "@/ui/reading-card/ReadingCard";
import { ErrorState } from "@/ui/states/ErrorState";
import { Skeleton } from "@/ui/states/Skeleton";
import { PracticeView } from "./PracticeView";

export function PracticeLoading() {
  return (
    <div role="status" aria-label="Loading" className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-72 w-full rounded-3xl" />
    </div>
  );
}

/** Loads the session (an empty PUT resumes it) and shows the first card not yet graded. Grading is F6.6. */
export function PracticeScreen({ sessionId, settings }: { sessionId: string; settings: ReadingSettings }) {
  const [data, setData] = useState<SessionResponse | null>(null);
  const [failed, setFailed] = useState(false);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    api.session(sessionId).then(setData, () => setFailed(true));
  }, [sessionId]);
  const retry = () => {
    setFailed(false);
    api.session(sessionId).then(setData, () => setFailed(true));
  };

  if (failed) return <div className="p-8"><ErrorState onRetry={retry} /></div>;
  if (!data) return <PracticeLoading />;

  const graded = new Set(data.grades.map((g) => g.cardId));
  const done = data.queue.filter((c) => graded.has(c.cardId)).length;
  const card = data.queue.find((c) => !graded.has(c.cardId));
  if (!card) return <p className="p-8">All cards in this session are done.</p>;

  return (
    <PracticeView
      card={card}
      revealed={revealed}
      done={done}
      total={data.queue.length}
      settings={settings}
      onReveal={() => setRevealed(true)}
    />
  );
}
