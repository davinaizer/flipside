import { and, asc, eq, isNull, sql } from "drizzle-orm";
import type { Db } from "@/server/db/client";
import { getDb } from "@/server/db/client";
import { cards, decks } from "@/server/db/schema";
import { ApiError } from "@/server/http/errors";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const deckColumns = {
  id: decks.id,
  name: decks.name,
  groupName: decks.groupName,
  color: decks.color,
  answerStyle: decks.answerStyle,
};

/**
 * The current profile's non-deleted decks with card counts. Due and mastery counts
 * and today's totals arrive with F4; every query is scoped by the owner id.
 */
export async function getLibrary(profileId: string, db: Db = getDb()) {
  const rows = await db
    .select({
      ...deckColumns,
      cardCount: sql<number>`count(${cards.id})::int`,
    })
    .from(decks)
    .leftJoin(cards, and(eq(cards.deckId, decks.id), isNull(cards.deletedAt)))
    .where(and(eq(decks.ownerProfileId, profileId), isNull(decks.deletedAt)))
    .groupBy(decks.id)
    .orderBy(asc(decks.groupName), asc(decks.name));
  return { decks: rows };
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
