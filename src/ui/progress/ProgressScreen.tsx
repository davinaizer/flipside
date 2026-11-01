"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { Stats } from "@/shared/schemas/stats";
import { api } from "@/ui/api/client";
import { startSession } from "@/ui/practice/start-session";
import { useSettings } from "@/ui/settings/SettingsProvider";
import { ErrorState } from "@/ui/states/ErrorState";
import { PageSkeleton } from "@/ui/states/Skeleton";
import { ProgressView, type Range } from "./ProgressView";

type State = { kind: "loading" } | { kind: "error" } | { kind: "ready"; stats: Stats };

/** Loads GET /stats for the chosen range; loading shows skeletons and a failure offers Retry. */
export function ProgressScreen() {
  const [range, setRange] = useState<Range>("week");
  const [state, setState] = useState<State>({ kind: "loading" });
  const router = useRouter();
  const { settings } = useSettings();
  const [practising, setPractising] = useState(false);
  const [practiseError, setPractiseError] = useState<string | null>(null);

  const load = useCallback((r: Range) => {
    api.stats(r).then(
      (stats) => setState({ kind: "ready", stats }),
      () => setState({ kind: "error" }),
    );
  }, []);
  useEffect(() => load(range), [load, range]);

  const change = (r: Range) => {
    setState({ kind: "loading" });
    setRange(r);
  };
  async function practise(t: { deckId: string; topic: string }) {
    setPractising(true);
    setPractiseError(null);
    try {
      const scope = { kind: "topics" as const, deckId: t.deckId, topics: [t.topic], ignoreDue: true };
      router.push(`/practice/${await startSession({ scope, length: settings.cardsPerSession })}`);
    } catch {
      setPractiseError("We could not start practice just now. Your cards are safe, so please try again.");
      setPractising(false);
    }
  }
  if (state.kind === "loading") return <PageSkeleton />;
  if (state.kind === "error") {
    return (
      <ErrorState
        onRetry={() => {
          setState({ kind: "loading" });
          load(range);
        }}
      />
    );
  }
  return <ProgressView stats={state.stats} range={range} onRangeChange={change} practising={practising} practiseError={practiseError} onPractise={practise} />;
}
