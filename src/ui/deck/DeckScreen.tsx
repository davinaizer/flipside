"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { SessionRequest } from "@/shared/schemas/session";
import { startSession } from "@/ui/practice/start-session";
import { DeckView, type DeckViewProps } from "./DeckView";

/** Holds the tick state and starts sessions; the deck itself is loaded by the server page. */
export function DeckScreen({
  deck,
  sessionLength,
}: {
  deck: DeckViewProps["deck"];
  sessionLength: SessionRequest["length"];
}) {
  const router = useRouter();
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const onToggle = (topic: string) =>
    setTicked((prev) => {
      const next = new Set(prev);
      if (!next.delete(topic)) next.add(topic);
      return next;
    });
  async function onStart(scope: SessionRequest["scope"]) {
    setBusy(true);
    setStartError(null);
    try {
      router.push(`/practice/${await startSession({ scope, length: sessionLength })}`);
    } catch {
      setStartError("We could not start practice just now. Your cards are safe, so please try again.");
      setBusy(false);
    }
  }
  return (
    <DeckView deck={deck} ticked={ticked} onToggle={onToggle} busy={busy} startError={startError} onStart={onStart} />
  );
}
