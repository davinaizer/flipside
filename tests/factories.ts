import type { Db } from "@/server/db/client";
import { cardState, cards, decks, profiles } from "@/server/db/schema";

/** Test data builders; each inserts one row with sensible defaults and returns it. */
export async function createProfile(db: Db, over: Partial<typeof profiles.$inferInsert> = {}) {
  const [row] = await db
    .insert(profiles)
    .values({
      name: "Test",
      avatar: "fox",
      accent: "primary",
      timezone: "Europe/London",
      dayStartHour: 7,
      ...over,
    })
    .returning();
  return row;
}

export async function createDeck(
  db: Db,
  ownerProfileId: string,
  over: Partial<typeof decks.$inferInsert> = {},
) {
  const [row] = await db
    .insert(decks)
    .values({ ownerProfileId, name: "Deck", ...over })
    .returning();
  return row;
}

let seq = 0;
export async function createCard(
  db: Db,
  deckId: string,
  over: Partial<typeof cards.$inferInsert> = {},
) {
  const n = ++seq;
  const [row] = await db
    .insert(cards)
    .values({
      deckId,
      externalId: `c${n}`,
      topic: "Topic",
      front: `Front ${n}`,
      back: `Back ${n}`,
      position: n,
      ...over,
    })
    .returning();
  return row;
}

export async function createCardState(
  db: Db,
  profileId: string,
  cardId: string,
  over: Partial<typeof cardState.$inferInsert> = {},
) {
  const [row] = await db
    .insert(cardState)
    .values({ profileId, cardId, box: 1, dueDate: "2026-01-01", ...over })
    .returning();
  return row;
}
