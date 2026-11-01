import type { SessionRequest } from "@/shared/schemas/session";

export interface TopicRow {
  topic: string;
  dueCount: number;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** What the main Practise button does for the current ticks (D2). */
export function practisePlan(deckId: string, topics: TopicRow[], ticked: Set<string>) {
  const chosen = topics.filter((t) => ticked.has(t.topic));
  if (chosen.length === 0) {
    const due = topics.reduce((n, t) => n + t.dueCount, 0);
    return {
      due,
      label: `Practise deck (${due} due)`,
      scope: { kind: "deck", deckId } as SessionRequest["scope"],
    };
  }
  const due = chosen.reduce((n, t) => n + t.dueCount, 0);
  return {
    due,
    label: `Practise ${plural(chosen.length, "topic")} (${due} due)`,
    scope: { kind: "topics", deckId, topics: chosen.map((t) => t.topic) } as SessionRequest["scope"],
  };
}

/** Practise anyway (D3): only the ticked topics that have nothing due, ignoring due dates. */
export function anywayPlan(deckId: string, topics: TopicRow[], ticked: Set<string>) {
  const idle = topics.filter((t) => ticked.has(t.topic) && t.dueCount === 0);
  if (idle.length === 0) return null;
  return {
    label: `Practise ${plural(idle.length, "topic")} with nothing due anyway (ignores due dates)`,
    scope: {
      kind: "topics",
      deckId,
      topics: idle.map((t) => t.topic),
      ignoreDue: true,
    } as SessionRequest["scope"],
  };
}
