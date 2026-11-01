// e2e only: one deck per seeded profile (no create API exists yet). Run after db:seed.
import { eq } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { cardState, cards, decks, profiles } from "@/server/db/schema";

const DECKS = { Davi: "Davi Science", Nicole: "Nicole History" } as const;
const db = getDb();
for (const [owner, name] of Object.entries(DECKS)) {
  const [p] = await db.select({ id: profiles.id }).from(profiles).where(eq(profiles.name, owner));
  if (!p) throw new Error(`profile ${owner} missing; run db:seed first`);
  const [deck] = await db.insert(decks).values({ ownerProfileId: p.id, name }).returning({ id: decks.id });
  if (owner !== "Davi") continue;
  // Deck page e2e: Cells has a due card, Energy has none due.
  const rows = await db
    .insert(cards)
    .values([
      { deckId: deck.id, externalId: "c1", topic: "Cells", front: "Q1", back: "A1", position: 1 },
      { deckId: deck.id, externalId: "e1", topic: "Energy", front: "Q2", back: "A2", position: 2 },
    ])
    .returning({ id: cards.id, topic: cards.topic });
  await db.insert(cardState).values(
    rows.map((r) => ({
      profileId: p.id,
      cardId: r.id,
      box: 1,
      dueDate: r.topic === "Cells" ? "2000-01-01" : "2999-01-01",
    })),
  );
}
console.log("Seeded e2e decks.");
process.exit(0);
