import { and, asc, eq, isNull, sql } from "drizzle-orm";
import type { Db } from "@/server/db/client";
import { getDb } from "@/server/db/client";
import { cardState, cards, decks } from "@/server/db/schema";
import { ApiError } from "@/server/http/errors";
import type { Profile } from "@/server/profile";
import { learningDay } from "@/domain/day";
import type { Box } from "@/domain/scheduler";
import { isWeak } from "@/domain/session-builder";
import { masteryBuckets } from "@/domain/stats";
import type { CardStatus, Grade } from "@/shared/enums";
import type { DeckSummary, Library } from "@/shared/schemas/library";
import { settingsSchema } from "@/shared/settings";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const deckColumns = {
  id: decks.id,
  name: decks.name,
  groupName: decks.groupName,
  color: decks.color,
  answerStyle: decks.answerStyle,
};

export const OTHER_GROUP = "Other";

/**
 * The current profile's library: decks grouped by group name (alphabetical, "Other" for
 * none, last), per-deck counts and mastery buckets, and today's totals. Every figure uses
 * the profile's learning day. Cards are read once and counted with the domain rules, so
 * "weak" and the mastery buckets have a single definition. Scoped by the owner id.
 */
export async function getLibrary(profile: Profile, now: Date = new Date(), db: Db = getDb()): Promise<Library> {
  const today = learningDay(now, profile.timezone, profile.dayStartHour);
  const [deckRows, cardRows] = await Promise.all([
    db
      .select(deckColumns)
      .from(decks)
      .where(and(eq(decks.ownerProfileId, profile.id), isNull(decks.deletedAt)))
      .orderBy(asc(decks.name)),
    db
      .select({
        id: cards.id,
        deckId: cards.deckId,
        topic: cards.topic,
        box: cardState.box,
        dueDate: cardState.dueDate,
        reps: cardState.reps,
        lapses: cardState.lapses,
        lastGrade: cardState.lastGrade,
        status: cardState.status,
      })
      .from(cards)
      .innerJoin(decks, eq(decks.id, cards.deckId))
      .leftJoin(
        cardState,
        and(eq(cardState.cardId, cards.id), eq(cardState.profileId, profile.id)),
      )
      .where(
        and(eq(decks.ownerProfileId, profile.id), isNull(decks.deletedAt), isNull(cards.deletedAt)),
      ),
  ]);

  const byDeck = new Map<string, typeof cardRows>();
  let dueCount = 0;
  let weakCount = 0;
  const dueByDeck = new Map<string, number>();
  for (const c of cardRows) {
    byDeck.set(c.deckId, [...(byDeck.get(c.deckId) ?? []), c]);
    if (c.box === null) continue;
    const state = {
      box: c.box as Box,
      dueDate: c.dueDate!,
      reps: c.reps!,
      lapses: c.lapses!,
      lastGrade: c.lastGrade as Grade | null,
      status: c.status as CardStatus,
    };
    if (isWeak({ id: c.id, deckId: c.deckId, topic: c.topic, state })) weakCount++;
    if (state.status !== "suspended" && state.dueDate <= today) {
      dueCount++;
      dueByDeck.set(c.deckId, (dueByDeck.get(c.deckId) ?? 0) + 1);
    }
  }

  const groups = new Map<string, DeckSummary[]>();
  for (const d of deckRows) {
    const deckCards = byDeck.get(d.id) ?? [];
    const topics = [...new Set(deckCards.map((c) => c.topic))].sort((a, b) => a.localeCompare(b));
    const m = masteryBuckets(deckCards);
    const name = d.groupName?.trim() || OTHER_GROUP;
    groups.set(name, [
      ...(groups.get(name) ?? []),
      {
        ...d,
        topicCount: topics.length,
        topics,
        cardCount: deckCards.length,
        dueCount: dueByDeck.get(d.id) ?? 0,
        mastery: { new: m.new, notYet: m.notYet, nearly: m.nearly, gotIt: m.gotIt },
      },
    ]);
  }

  return {
    today: {
      dueCount,
      decksWithDue: dueByDeck.size,
      sessionLength: settingsSchema.parse(profile.settings).cardsPerSession,
      weakCount,
    },
    groups: [...groups.entries()]
      // Other is a catch-all, so it sorts after the named groups.
      .sort(([a], [b]) =>
        a === OTHER_GROUP ? 1 : b === OTHER_GROUP ? -1 : a.localeCompare(b),
      )
      .map(([name, groupDecks]) => ({ name, decks: groupDecks })),
  };
}

/** One deck with its topics and card counts. Another profile's, deleted or unknown ids are all 404. */
export async function getDeck(profileId: string, deckId: string, db: Db = getDb()) {
  const notFound = () => new ApiError(404, "deck_not_found", "That deck does not exist.");
  if (!UUID.test(deckId)) throw notFound();
  const [deck] = await db
    .select(deckColumns)
    .from(decks)
    .where(
      and(
        eq(decks.id, deckId.toLowerCase()),
        eq(decks.ownerProfileId, profileId),
        isNull(decks.deletedAt),
      ),
    );
  if (!deck) throw notFound();
  const topics = await db
    .select({ topic: cards.topic, cardCount: sql<number>`count(*)::int` })
    .from(cards)
    .where(and(eq(cards.deckId, deck.id), isNull(cards.deletedAt)))
    .groupBy(cards.topic)
    .orderBy(asc(cards.topic));
  return { deck: { ...deck, cardCount: topics.reduce((n, t) => n + t.cardCount, 0), topics } };
}
