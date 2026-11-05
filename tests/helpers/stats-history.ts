import { eq } from "drizzle-orm";
import history from "../../fixtures/stats-history.json";
import type { Db } from "@/server/db/client";
import { cards, decks } from "@/server/db/schema";
import {
  createCard,
  createCardState,
  createDeck,
  createProfile,
  createReviewLog,
} from "../factories";

export { history };

/**
 * Seeds fixtures/stats-history.json: two profiles, their decks, cards, card states and
 * review log. Returns the profiles and the generated ids keyed by the fixture keys, so
 * tests can turn the expected values (which name decks by key) into real ids.
 */
export async function seedStatsHistory(db: Db) {
  const me = await createProfile(db, history.profile);
  const other = await createProfile(db, history.otherProfile);
  const owners = { me, other } as const;

  const deckIds: Record<string, string> = {};
  for (const d of history.decks) {
    const owner = owners[d.owner as keyof typeof owners];
    const row = await createDeck(db, owner.id, { name: d.name, color: d.color });
    deckIds[d.key] = row.id;
  }

  const cardIds: Record<string, string> = {};
  const cardOwner: Record<string, string> = {};
  for (const c of history.cards) {
    const deck = history.decks.find((d) => d.key === c.deck)!;
    const ownerId = owners[deck.owner as keyof typeof owners].id;
    const row = await createCard(db, deckIds[c.deck]!, { topic: c.topic, externalId: c.key });
    cardIds[c.key] = row.id;
    cardOwner[c.key] = ownerId;
    if (c.box !== null)
      await createCardState(db, ownerId, row.id, { box: c.box, lapses: c.lapses });
    if ("deleted" in c && c.deleted)
      await db.update(cards).set({ deletedAt: new Date() }).where(eq(cards.id, row.id));
  }

  for (const r of history.reviews) {
    await createReviewLog(db, cardOwner[r.card]!, cardIds[r.card]!, {
      grade: r.grade,
      durationMs: r.durationMs,
      reviewedAt: new Date(r.reviewedAt),
      isFirstAttemptToday: r.first,
      undoneAt: "undoneAt" in r && r.undoneAt ? new Date(r.undoneAt) : null,
    });
  }

  // Delete after seeding so the deleted deck's cards and reviews exist as history.
  for (const d of history.decks)
    if (d.deleted) {
      const at = new Date(history.now);
      await db.update(decks).set({ deletedAt: at }).where(eq(decks.id, deckIds[d.key]!));
      await db.update(cards).set({ deletedAt: at }).where(eq(cards.deckId, deckIds[d.key]!));
    }

  return { me, other, deckIds, cardIds };
}
