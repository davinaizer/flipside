import { asProfile } from "./factories";
import { expect, test, vi, inject } from "vitest";
import { freshDatabase } from "./helpers/db";

test("GET /stats matches the hand-computed figures for the seeded history (AC8)", async () => {
  const url = await freshDatabase(inject("testDatabaseUrl"), "flipside_stats_api");
  vi.stubEnv("DATABASE_URL", url);
  const { runMigrations } = await import("@/server/db/migrate");
  const { getDb } = await import("@/server/db/client");
  const db = getDb();
  await runMigrations(db);
  const f = await import("./factories");
  const { seedStatsHistory, history } = await import("./helpers/stats-history");
  const { getStats } = await import("@/server/stats");
  const { statsSchema } = await import("@/shared/schemas/stats");
  const route = await import("@/app/api/v1/stats/route");

  const { me, other, deckIds } = await seedStatsHistory(db);
  const now = new Date(history.now);
  const exp = history.expected;
  const focusNext = exp.focusNext.map(({ deck, ...t }) => ({ deckId: deckIds[deck], ...t }));

  for (const range of ["week", "month"] as const) {
    const s = statsSchema.parse(await getStats(me, range, now, db));
    const e = exp[range];
    expect(s.range).toBe(range);
    expect(s.today).toBe(e.today);
    expect(s.hasReviews).toBe(true);
    // Tiles: first attempts only, undone rows out, median of capped times, deleted deck reviews in.
    expect(s.windows).toEqual(e.windows);
    expect(s.current).toEqual(e.current);
    expect(s.previous).toEqual(e.previous);
    expect(s.changes).toEqual(e.changes);
    expect(s.bars).toEqual(e.bars);
    // Focus next and By deck: live decks of this profile only.
    expect(s.focusNext).toEqual(focusNext);
    expect(s.byDeck).toEqual(
      exp.byDeck.map(({ deck, ...d }) => ({
        deckId: deckIds[deck],
        ...d,
        medianSeconds: e.byDeckMedianSeconds[deck as keyof typeof e.byDeckMedianSeconds],
      })),
    );
  }

  // The other profile sees only its own three reviews and deck.
  const o = await getStats(other, "month", now, db);
  expect(o.current.cardsReviewed).toBe(3);
  expect(o.current.medianSeconds).toBe(100);
  expect(o.focusNext.map((t) => t.topic)).toEqual(["Alien"]);
  expect(o.byDeck.map((d) => d.name)).toEqual(["Foreign"]);
  const ow = await getStats(other, "week", now, db);
  expect(ow.current.cardsReviewed).toBe(2);
  expect(ow.previous.cardsReviewed).toBe(0);

  // A profile with no reviews: the empty state flag, zero bars, nothing to focus on.
  const fresh = await f.createProfile(db, { name: "Fresh" });
  const empty = statsSchema.parse(await getStats(fresh, "week", now, db));
  expect(empty.hasReviews).toBe(false);
  expect(empty.current).toEqual({
    cardsReviewed: 0,
    gotItRate: null,
    medianSeconds: null,
    daysPractised: 0,
    daysInWindow: 7,
  });
  expect(empty.bars.every((b) => b.cardsReviewed === 0)).toBe(true);
  expect(empty.focusNext).toEqual([]);
  expect(empty.byDeck).toEqual([]);

  // Route: range parsing, default week, 400 for a bad range, 401 without a profile.
  const get = (query: string, headers: Record<string, string> = asProfile(me.id)) =>
    route.GET(new Request(`http://local/api/v1/stats${query}`, { headers }));
  const month = await get("?range=month");
  expect(month.status).toBe(200);
  const body = statsSchema.parse(await month.json());
  expect(body.range).toBe("month");
  expect(body.byDeck.map((d) => d.name)).toEqual(["Geography", "Biology", "Empty"]);
  expect((await (await get("")).json()).range).toBe("week");
  const bad = await get("?range=year");
  expect(bad.status).toBe(400);
  expect((await bad.json()).error.code).toBe("invalid_range");
  expect((await get("?range=week", {})).status).toBe(401);
});
