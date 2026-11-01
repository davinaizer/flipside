"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { SessionSummary } from "@/shared/schemas/session";
import { api } from "@/ui/api/client";
import { ErrorState } from "@/ui/states/ErrorState";
import { PracticeLoading } from "./PracticeScreen";
import { startSession } from "./start-session";
import { SummaryView } from "./SummaryView";

/** Loads GET /sessions/{id}/summary; Practise the misses starts a new session from the explicit miss list. */
export function SummaryScreen({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startFailed, setStartFailed] = useState(false);

  useEffect(() => {
    api.summary(sessionId).then(setSummary, () => setLoadFailed(true));
  }, [sessionId]);
  const load = () => {
    setLoadFailed(false);
    api.summary(sessionId).then(setSummary, () => setLoadFailed(true));
  };

  if (loadFailed) return <div className="p-8"><ErrorState onRetry={load} /></div>;
  if (!summary) return <PracticeLoading />;
  return (
    <SummaryView
      summary={summary}
      starting={starting}
      failed={startFailed}
      onPractiseMisses={() => {
        setStarting(true);
        setStartFailed(false);
        startSession({ scope: { kind: "cards", cardIds: summary.missIds }, length: "all" }).then(
          (id) => router.push(`/practice/${id}`),
          () => {
            setStarting(false);
            setStartFailed(true);
          },
        );
      }}
    />
  );
}
