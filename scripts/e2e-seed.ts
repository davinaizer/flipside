// e2e only: one deck per seeded profile (no create API exists yet). Run after db:seed.
import { eq } from "drizzle-orm";
import { adoptProfiles } from "@/server/accounts";
import { seedDevAccount } from "@/server/seed";
import { getDb } from "@/server/db/client";
import { AVATAR_IDS, DEFAULT_ACCENT } from "@/shared/avatars";
import { DEFAULT_DAY_START_HOUR, DEFAULT_TIMEZONE } from "@/shared/constants";
import { DEFAULT_SETTINGS } from "@/shared/settings";
import { cardState, cards, decks, profiles, reviewLog } from "@/server/db/schema";

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
// settings.spec.ts changes settings, so each project gets its own profile and cannot disturb Davi or Nicole.
// practice.spec.ts grades cards, so every scenario in each project gets its own profile (names carry no "Davi" or "Nicole").
const PRACTICE = ["open", "grade", "requeue", "cap", "flip", "summary"].flatMap((s) => [`Practice ${s} desktop`, `Practice ${s} ipad`]);
// journey.spec.ts walks the whole path from an empty profile, one per project.
const JOURNEY = ["Journey desktop", "Journey ipad"];
// a11y.spec.ts imports a deck and grades one card, then walks every screen; it owns one profile per project.
const A11Y = ["A11y desktop", "A11y ipad"];
// performance.spec.ts times Start and grading on a fresh imported deck; one profile per project.
const PERF = ["Perf desktop", "Perf ipad"];
// profiles.spec.ts renames the profile and changes its avatar (AC15); one per project.
const PROFILE = ["Profile desktop", "Profile ipad"];
for (const name of ["Settings Desktop", "Settings iPad", ...PRACTICE, ...JOURNEY, ...A11Y, ...PERF, ...PROFILE]) {
  await db.insert(profiles).values({
    name,
    avatar: AVATAR_IDS[2] ?? AVATAR_IDS[0],
    accent: DEFAULT_ACCENT,
    timezone: DEFAULT_TIMEZONE,
    dayStartHour: DEFAULT_DAY_START_HOUR,
    settings: DEFAULT_SETTINGS,
  });
}

// progress.spec.ts reads statistics, so each scenario owns a profile: "main" (read-only), "undo" (gets a graded card and an undo)
// and "empty" (no reviews). main and undo share this history, all reviewed now, so it sits in the current week and month:
// Cells box 1, 1, 4 (mastery 33%) and Energy box 4, 5, 5 (100%); four first attempts of 4, 6, 8 and 10 s graded
// got_it, got_it, nearly, not_yet. The spec's hand-computed figures: 4 reviewed, 50%, median 7 s, 1 day practised.
const PROGRESS_CARDS = [
  { topic: "Cells", box: 1, grade: "got_it", ms: 4000 },
  { topic: "Cells", box: 1, grade: "got_it", ms: 6000 },
  { topic: "Cells", box: 4, grade: "nearly", ms: 8000 },
  { topic: "Energy", box: 4, grade: "not_yet", ms: 10000 },
  { topic: "Energy", box: 5, grade: null, ms: 0 },
  { topic: "Energy", box: 5, grade: null, ms: 0 },
] as const;
for (const scenario of ["main", "undo", "empty"]) {
  for (const project of ["desktop", "ipad"]) {
    const [p] = await db
      .insert(profiles)
      .values({
        name: `Progress ${scenario} ${project}`,
        avatar: AVATAR_IDS[2] ?? AVATAR_IDS[0],
        accent: DEFAULT_ACCENT,
        timezone: DEFAULT_TIMEZONE,
        dayStartHour: DEFAULT_DAY_START_HOUR,
        settings: DEFAULT_SETTINGS,
      })
      .returning({ id: profiles.id });
    if (scenario === "empty") continue;
    const [deck] = await db.insert(decks).values({ ownerProfileId: p.id, name: "Progress science" }).returning({ id: decks.id });
    const rows = await db
      .insert(cards)
      .values(PROGRESS_CARDS.map((c, i) => ({ deckId: deck.id, externalId: `p${i}`, topic: c.topic, front: `Q${i}`, back: `A${i}`, position: i })))
      .returning({ id: cards.id, position: cards.position });
    // The undo scenario grades this extra New card through the API, so main's figures stay fixed.
    if (scenario === "undo")
      await db.insert(cards).values({ deckId: deck.id, externalId: "extra", topic: "Extra", front: "QX", back: "AX", position: 99 });
    const now = new Date();
    for (const r of rows) {
      const c = PROGRESS_CARDS[r.position]!;
      await db.insert(cardState).values({ profileId: p.id, cardId: r.id, box: c.box, dueDate: "2999-01-01" });
      if (c.grade)
        await db.insert(reviewLog).values({
          id: crypto.randomUUID(),
          profileId: p.id,
          cardId: r.id,
          grade: c.grade,
          durationMs: c.ms,
          reviewedAt: now,
          isFirstAttemptToday: true,
          boxBefore: 1,
          boxAfter: c.box,
          dueAfter: "2999-01-01",
        });
    }
  }
}
// The development account owns every e2e profile too, so the signed-in picker lists them all.
const accountId = await seedDevAccount(db);
if (accountId) await adoptProfiles(accountId, db);
console.log("Seeded e2e decks.");
process.exit(0);
