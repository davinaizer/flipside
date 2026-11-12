import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import type { Db } from "@/server/db/client";
import {
  accounts,
  cardState,
  cards,
  decks,
  profiles,
  reviewLog,
  signInTokens,
} from "@/server/db/schema";

/** Raw sign-in token of the default test account; every factory profile belongs to that account. */
export const TEST_SIGN_IN_TOKEN = "test-sign-in-token";

/**
 * The default test account and a live sign-in token for it (AU6), created once per database.
 * The token value is fixed so request builders can stay synchronous.
 */
export async function defaultTestAccount(db: Db): Promise<string> {
  await db
    .insert(accounts)
    .values({ email: "test@flipside.local", passwordHash: "not-a-hash" })
    .onConflictDoNothing();
  const [account] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(eq(accounts.email, "test@flipside.local"));
  await db
    .insert(signInTokens)
    .values({
      accountId: account.id,
      tokenHash: createHash("sha256").update(TEST_SIGN_IN_TOKEN).digest("hex"),
      expiresAt: new Date("2100-01-01T00:00:00Z"),
    })
    .onConflictDoNothing();
  return account.id;
}

/** Request headers that act as the profile, signed in to the default test account. */
export function asProfile(profileId: string, extra: Record<string, string> = {}) {
  return { "x-profile-id": profileId, cookie: `flipside_sign_in=${TEST_SIGN_IN_TOKEN}`, ...extra };
}

/** Cookie header with the default test sign-in token and the profile cookie. */
export function signedInCookie(profileId: string): string {
  return `flipside_sign_in=${TEST_SIGN_IN_TOKEN}; flipside_profile=${profileId}`;
}

/** Test data builders; each inserts one row with sensible defaults and returns it. */
export async function createProfile(db: Db, over: Partial<typeof profiles.$inferInsert> = {}) {
  const accountId = "accountId" in over ? over.accountId : await defaultTestAccount(db);
  const [row] = await db
    .insert(profiles)
    .values({
      accountId,
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

export async function createReviewLog(
  db: Db,
  profileId: string,
  cardId: string,
  over: Partial<typeof reviewLog.$inferInsert> = {},
) {
  const [row] = await db
    .insert(reviewLog)
    .values({
      id: crypto.randomUUID(),
      profileId,
      cardId,
      grade: "got_it",
      durationMs: 3000,
      reviewedAt: new Date("2026-01-01T09:00:00Z"),
      isFirstAttemptToday: true,
      boxBefore: 1,
      boxAfter: 2,
      dueAfter: "2026-01-03",
      ...over,
    })
    .returning();
  return row;
}
