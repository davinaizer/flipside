/**
 * Session builder (PRD section 5 "Building a session", R1, L3, D3, R11).
 *
 * Pure: given the profile's cards with their scheduler state (null for New),
 * a scope, a length, the learning day, how many new cards may still be
 * introduced today and a random source, returns the ordered card ids.
 *
 * Order: due cards first, lowest box, then oldest due date, shuffled within
 * ties; new cards last, in the order given (caller passes deck position order),
 * never more than `newRemaining` of them.
 */
import type { SESSION_LENGTHS } from "../shared/constants";
import type { LocalDate } from "./day";
import type { SchedulerState } from "./scheduler";

export type SessionLength = (typeof SESSION_LENGTHS)[number];

export interface SessionCard {
  id: string;
  deckId: string;
  topic: string;
  /** null means New: the profile has never graded the card. */
  state: SchedulerState | null;
}

export interface TopicRef {
  deckId: string;
  topic: string;
}

export type SessionScope =
  | { kind: "all" }
  | { kind: "deck"; deckId: string }
  /** ignoreDue: practise the topics anyway, ignoring due dates (D3). */
  | { kind: "topics"; topics: TopicRef[]; ignoreDue?: boolean }
  | { kind: "weak" }
  /** An explicit list, e.g. Practise the misses (R11). Due dates are ignored. */
  | { kind: "cards"; cardIds: string[] };

export interface BuildSessionInput {
  cards: SessionCard[];
  scope: SessionScope;
  length: SessionLength;
  today: LocalDate;
  /** New cards still allowed today: daily cap minus cards introduced today. */
  newRemaining: number;
  /** Returns a number in [0, 1), like Math.random. Injected for tests. */
  random: () => number;
}

export interface BuiltSession {
  cardIds: string[];
  /** Candidates before the length cut (what "All due" would give). */
  candidateCount: number;
}

/** Weak: active cards in box 1 that have been graded at least once, plus leeches. */
export function isWeak(card: SessionCard): boolean {
  const s = card.state;
  if (s === null || s.status === "suspended") return false;
  return s.status === "leech" || (s.box === 1 && s.reps >= 1);
}

function inScope(card: SessionCard, scope: SessionScope): boolean {
  switch (scope.kind) {
    case "all":
      return true;
    case "deck":
      return card.deckId === scope.deckId;
    case "topics":
      return scope.topics.some((t) => t.deckId === card.deckId && t.topic === card.topic);
    case "weak":
      return isWeak(card);
    case "cards":
      return scope.cardIds.includes(card.id);
  }
}

function ignoresDue(scope: SessionScope): boolean {
  return scope.kind === "cards" || (scope.kind === "topics" && scope.ignoreDue === true);
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

export function buildSession(input: BuildSessionInput): BuiltSession {
  const { cards, scope, length, today, random } = input;
  const skipDue = ignoresDue(scope);

  const scoped = cards.filter((c) => c.state?.status !== "suspended" && inScope(c, scope));

  const active = scoped.filter(
    (c): c is SessionCard & { state: SchedulerState } =>
      c.state !== null && (skipDue || c.state.dueDate <= today),
  );
  const fresh = scoped
    .filter((c) => c.state === null)
    .slice(0, Math.max(0, Math.floor(input.newRemaining)));

  // Group by (box, dueDate), order groups, shuffle each group.
  const groups = new Map<string, SessionCard[]>();
  for (const c of active) {
    const key = `${c.state.box}|${c.state.dueDate}`;
    const g = groups.get(key);
    if (g) g.push(c);
    else groups.set(key, [c]);
  }
  const orderedKeys = [...groups.keys()].sort((a, b) => {
    const [boxA, dueA] = a.split("|") as [string, string];
    const [boxB, dueB] = b.split("|") as [string, string];
    return Number(boxA) - Number(boxB) || (dueA < dueB ? -1 : dueA > dueB ? 1 : 0);
  });
  const due = orderedKeys.flatMap((k) => shuffle(groups.get(k)!, random));

  const candidates = [...due, ...fresh].map((c) => c.id);
  const cardIds = length === "all" ? candidates : candidates.slice(0, length);
  return { cardIds, candidateCount: candidates.length };
}
