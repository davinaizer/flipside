// e2e only: one deck per seeded profile (no create API exists yet). Run after db:seed.
import { eq } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { decks, profiles } from "@/server/db/schema";

const DECKS = { Davi: "Davi Science", Nicole: "Nicole History" } as const;
const db = getDb();
for (const [owner, name] of Object.entries(DECKS)) {
  const [p] = await db.select({ id: profiles.id }).from(profiles).where(eq(profiles.name, owner));
  if (!p) throw new Error(`profile ${owner} missing; run db:seed first`);
  await db.insert(decks).values({ ownerProfileId: p.id, name });
}
console.log("Seeded e2e decks.");
process.exit(0);
