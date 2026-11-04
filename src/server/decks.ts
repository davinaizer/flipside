import { z } from "zod";
import { and, asc, desc, eq, gte, isNull, sql } from "drizzle-orm";
import type { Db } from "@/server/db/client";
import { getDb } from "@/server/db/client";
import { cardState, cards, decks, reviewLog } from "@/server/db/schema";
import { ApiError } from "@/server/http/errors";
import type { Profile } from "@/server/profile";
import { dayStartUtc, learningDay } from "@/domain/day";
import { stateColumns, toSchedulerState } from "@/server/card-state";
import { candidateCounts, isWeak, sessionCandidateCount } from "@/domain/session-builder";
import { masteryBuckets } from "@/domain/stats";
import { ANSWER_STYLES, CARD_COLORS } from "@/shared/enums";
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

/** New cards the profile may still meet today: the daily cap minus cards introduced since the learning day began (PRD section 5). */
export async function newCardsRemaining(profile: Profile, today: string, db: Db): Promise<number> {
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(reviewLog)
    .where(
      and(
        eq(reviewLog.profileId, profile.id),
        eq(reviewLog.introducedNew, true),
        isNull(reviewLog.undoneAt),
        gte(reviewLog.reviewedAt, dayStartUtc(today, profile.timezone, profile.dayStartHour)),
      ),
    );
  return Math.max(0, settingsSchema.parse(profile.settings).newCardsPerDay - n);
}

/**
 * The current profile's library: decks grouped by group name (alphabetical, "Other" for
 * none, last), per-deck counts and mastery buckets, and today's totals. Every figure uses
 * the profile's learning day. Cards are read once and counted with the domain rules, so
 * "weak" and the mastery buckets have a single definition. Scoped by the owner id.
 */
export async function getLibrary(profile: Profile, now: Date = new Date(), db: Db = getDb()): Promise<Library> {
  const today = learningDay(now, profile.timezone, profile.dayStartHour);
  const [newRemaining, deckRows, cardRows] = await Promise.all([
    newCardsRemaining(profile, today, db),
    db
      .select(deckColumns)
      .from(decks)
      .where(and(eq(decks.ownerProfileId, profile.id), isNull(decks.deletedAt)))
      .orderBy(asc(decks.name)),
    db
      .select({ id: cards.id, deckId: cards.deckId, topic: cards.topic, ...stateColumns })
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
  for (const c of cardRows) byDeck.set(c.deckId, [...(byDeck.get(c.deckId) ?? []), c]);
  const sessionCards = cardRows.map((c) => ({ id: c.id, deckId: c.deckId, topic: c.topic, state: toSchedulerState(c) }));
  const weakCount = sessionCards.filter(isWeak).length;
  let dueCount = 0;
  let newCount = 0;
  const dueByDeck = new Map<string, number>();
  for (const k of candidateCounts(sessionCards, today)) {
    dueCount += k.due;
    newCount += k.new;
    if (k.due > 0) dueByDeck.set(k.deckId, (dueByDeck.get(k.deckId) ?? 0) + k.due);
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
      startableCount: sessionCandidateCount(dueCount, newCount, newRemaining),
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

/** The deck row if this profile owns it and it is not deleted; otherwise 404 (same for unknown and other profiles' ids). */
export async function findDeck(profileId: string, deckId: string, db: Db = getDb()) {
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
  return deck;
}

/**
 * One deck with per-topic card count, due count, mastery buckets (New included) and
 * mastered percentage, plus the card and review record counts the delete confirmation
 * states (D5). Review records count the profile's non-undone reviews of the deck's cards.
 */
export async function getDeck(profile: Profile, deckId: string, now: Date = new Date(), db: Db = getDb()) {
  const deck = await findDeck(profile.id, deckId, db);
  const today = learningDay(now, profile.timezone, profile.dayStartHour);
  const [newRemaining, rows, [{ n: reviewCount }]] = await Promise.all([
    newCardsRemaining(profile, today, db),
    db
      .select({ id: cards.id, topic: cards.topic, ...stateColumns })
      .from(cards)
      .leftJoin(
        cardState,
        and(eq(cardState.cardId, cards.id), eq(cardState.profileId, profile.id)),
      )
      .where(and(eq(cards.deckId, deck.id), isNull(cards.deletedAt)))
      .orderBy(asc(cards.topic)),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(reviewLog)
      .innerJoin(cards, eq(cards.id, reviewLog.cardId))
      .where(
        and(
          eq(cards.deckId, deck.id),
          eq(reviewLog.profileId, profile.id),
          isNull(reviewLog.undoneAt),
        ),
      ),
  ]);
  const byTopic = new Map<string, typeof rows>();
  for (const r of rows) byTopic.set(r.topic, [...(byTopic.get(r.topic) ?? []), r]);
  const dueByTopic = new Map(
    candidateCounts(
      rows.map((r) => ({ id: r.id, deckId: deck.id, topic: r.topic, state: toSchedulerState(r) })),
      today,
    ).map((k) => [k.topic, k.due]),
  );
  const topics = [...byTopic.entries()].map(([topic, list]) => {
    const m = masteryBuckets(list);
    return {
      topic,
      cardCount: list.length,
      dueCount: dueByTopic.get(topic) ?? 0,
      mastery: { new: m.new, notYet: m.notYet, nearly: m.nearly, gotIt: m.gotIt },
      masteredPercent: m.mastery === null ? 0 : Math.round(m.mastery * 100),
    };
  });
  return {
    deck: { ...deck, cardCount: rows.length, reviewCount, newRemaining, topics },
  };
}

const colorOrNull = z.enum(CARD_COLORS).nullable();
export const deckPatchSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    groupName: z.string().trim().max(100).nullable(),
    color: colorOrNull,
    answerStyle: z.enum(ANSWER_STYLES),
  })
  .partial()
  .strict()
  .refine((v) => Object.keys(v).length > 0, "Nothing to change.");

/** Rename, regroup, recolour or change answer style. An empty group name clears the group. */
export async function updateDeck(profileId: string, deckId: string, body: unknown, db: Db = getDb()) {
  const deck = await findDeck(profileId, deckId, db);
  const parsed = deckPatchSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(
      400,
      "invalid_request",
      "The deck changes are not valid.",
      parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    );
  }
  const patch = { ...parsed.data };
  if (patch.groupName === "") patch.groupName = null;
  const [row] = await db
    .update(decks)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(decks.id, deck.id))
    .returning(deckColumns);
  return { deck: row };
}

/** Soft delete: deck and cards get deleted_at; card_state and review_log stay for statistics. */
export async function deleteDeck(profileId: string, deckId: string, db: Db = getDb()) {
  const deck = await findDeck(profileId, deckId, db);
  const at = new Date();
  await db.transaction(async (tx) => {
    await tx.update(cards).set({ deletedAt: at, updatedAt: at }).where(and(eq(cards.deckId, deck.id), isNull(cards.deletedAt)));
    await tx.update(decks).set({ deletedAt: at, updatedAt: at }).where(eq(decks.id, deck.id));
  });
}

/** Cards flagged as leeches (status leech) for rewording, most lapses first (D6). */
export async function getLeeches(profileId: string, deckId: string, db: Db = getDb()) {
  const deck = await findDeck(profileId, deckId, db);
  const leeches = await db
    .select({
      id: cards.id,
      topic: cards.topic,
      front: cards.front,
      back: cards.back,
      lapses: cardState.lapses,
    })
    .from(cards)
    .innerJoin(cardState, and(eq(cardState.cardId, cards.id), eq(cardState.profileId, profileId)))
    .where(and(eq(cards.deckId, deck.id), isNull(cards.deletedAt), eq(cardState.status, "leech")))
    .orderBy(desc(cardState.lapses), asc(cards.position));
  return { leeches };
}
