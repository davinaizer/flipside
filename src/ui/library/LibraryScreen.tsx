"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { Library } from "@/shared/schemas/library";
import { api } from "@/ui/api/client";
import { startSession } from "@/ui/practice/start-session";
import { ErrorState } from "@/ui/states/ErrorState";
import { PageSkeleton } from "@/ui/states/Skeleton";
import { LibraryView } from "./LibraryView";

type State = { kind: "loading" } | { kind: "error" } | { kind: "ready"; library: Library };

/** Loads GET /library on the client so loading shows skeletons and a failure offers Retry. */
export function LibraryScreen() {
  const router = useRouter();
  const [state, setState] = useState<State>({ kind: "loading" });
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const fetchLibrary = useCallback(() => {
    api.library().then(
      (library) => setState({ kind: "ready", library }),
      () => setState({ kind: "error" }),
    );
  }, []);
  // The initial state is already "loading", so the first fetch sets state only when it settles.
  useEffect(fetchLibrary, [fetchLibrary]);
  const retry = () => {
    setState({ kind: "loading" });
    fetchLibrary();
  };

  if (state.kind === "loading") return <PageSkeleton />;
  if (state.kind === "error") return <ErrorState onRetry={retry} />;

  const { sessionLength } = state.library.today;
  async function onStart(scope: "all" | "weak") {
    setBusy(true);
    setStartError(null);
    try {
      const id = await startSession({ scope: { kind: scope }, length: sessionLength });
      router.push(`/practice/${id}`);
    } catch {
      setStartError(
        "We could not start practice just now. Your cards are safe, so please try again.",
      );
      setBusy(false);
    }
  }
  return (
    <LibraryView
      library={state.library}
      busy={busy}
      startError={startError}
      onStart={onStart}
      query={query}
      onQueryChange={setQuery}
    />
  );
}
