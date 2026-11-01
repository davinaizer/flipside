import { describe, expect, it } from "vitest";
import fixtures from "../../fixtures/domain/session-builder.json";
import { SESSION_LENGTHS } from "../shared/constants";
import {
  buildSession,
  isWeak,
  type SessionCard,
  type SessionLength,
  type SessionScope,
} from "./session-builder";

const cards = fixtures.cards as SessionCard[];

function cycled(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length]!;
}

function seeded(seed: number): () => number {
  // mulberry32
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32;
  };
}

describe("buildSession fixtures", () => {
  it.each(fixtures.cases)("$name", (c) => {
    const result = buildSession({
      cards,
      scope: c.scope as SessionScope,
      length: c.length as SessionLength,
      today: fixtures.today,
      newRemaining: c.newRemaining,
      random: cycled(c.random),
    });
    expect(result).toEqual({ cardIds: c.expected, candidateCount: c.candidateCount });
  });

  it("covers every scope and every length", () => {
    const kinds = new Set(fixtures.cases.map((c) => c.scope.kind));
    expect([...kinds].sort()).toEqual(["all", "cards", "deck", "topics", "weak"]);
    expect(fixtures.cases.some((c) => c.scope.kind === "topics" && c.scope.ignoreDue)).toBe(true);
    const lengths = new Set(fixtures.cases.map((c) => c.length));
    for (const l of SESSION_LENGTHS) expect(lengths).toContain(l);
  });

  it("fixture pool has 16 new cards", () => {
    expect(cards.filter((c) => c.state === null)).toHaveLength(16);
  });
});

describe("buildSession invariants", () => {
  const allIds = cards.map((c) => c.id);
  const scopes: SessionScope[] = [
    { kind: "all" },
    { kind: "deck", deckId: "A" },
    { kind: "deck", deckId: "B" },
    {
      kind: "topics",
      topics: [
        { deckId: "A", topic: "cells" },
        { deckId: "A", topic: "plants" },
        { deckId: "B", topic: "atoms" },
      ],
    },
    {
      kind: "topics",
      topics: [
        { deckId: "A", topic: "cells" },
        { deckId: "A", topic: "plants" },
        { deckId: "B", topic: "atoms" },
      ],
      ignoreDue: true,
    },
    { kind: "weak" },
    { kind: "cards", cardIds: allIds },
  ];
  const byId = new Map(cards.map((c) => [c.id, c]));

  for (const scope of scopes) {
    for (const length of SESSION_LENGTHS) {
      for (const seed of [1, 2, 3, 42]) {
        const label = `${JSON.stringify(scope)} length ${length} seed ${seed}`;
        it(label, () => {
          const { cardIds, candidateCount } = buildSession({
            cards,
            scope,
            length,
            today: fixtures.today,
            newRemaining: 10,
            random: seeded(seed),
          });
          const picked = cardIds.map((id) => byId.get(id)!);
          // never more than 10 new with 16 new and 10 remaining
          expect(picked.filter((c) => c.state === null).length).toBeLessThanOrEqual(10);
          // suspended excluded
          expect(picked.some((c) => c.state?.status === "suspended")).toBe(false);
          // length
          expect(cardIds.length).toBe(
            length === "all" ? candidateCount : Math.min(length, candidateCount),
          );
          expect(new Set(cardIds).size).toBe(cardIds.length);
          // order: active by box then due date, new last
          const firstNew = picked.findIndex((c) => c.state === null);
          if (firstNew >= 0) expect(picked.slice(firstNew).every((c) => c.state === null)).toBe(true);
          const active = picked.filter((c) => c.state !== null).map((c) => c.state!);
          for (let i = 1; i < active.length; i++) {
            const a = active[i - 1]!;
            const b = active[i]!;
            expect(a.box < b.box || (a.box === b.box && a.dueDate <= b.dueDate)).toBe(true);
          }
          if (scope.kind === "weak") expect(picked.every(isWeak)).toBe(true);
        });
      }
    }
  }

  it("shuffles ties with the injected random source", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 20; seed++) {
      const { cardIds } = buildSession({
        cards,
        scope: { kind: "all" },
        length: "all",
        today: fixtures.today,
        newRemaining: 0,
        random: seeded(seed),
      });
      seen.add(cardIds.slice(0, 2).join(","));
    }
    expect(seen).toEqual(new Set(["a2,a3", "a3,a2"]));
  });

  it("does not mutate the input", () => {
    const copy = structuredClone(cards);
    buildSession({
      cards,
      scope: { kind: "all" },
      length: "all",
      today: fixtures.today,
      newRemaining: 10,
      random: seeded(7),
    });
    expect(cards).toEqual(copy);
  });
});

describe("isWeak", () => {
  it("is box 1 graded at least once, or a leech, never suspended or new", () => {
    const weak = cards.filter(isWeak).map((c) => c.id);
    expect(weak).toEqual(["a1", "a2", "a3", "a8", "b1", "b3"]);
  });
});
