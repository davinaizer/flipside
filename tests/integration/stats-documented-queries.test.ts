import { afterEach, expect, test, vi, inject } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { freshDatabase } from "../helpers/db";

/** The named ```sql blocks of docs/statistics-queries.md, keyed by their `-- name:` line. */
async function documentedQueries(): Promise<Record<string, string>> {
  const doc = await readFile(join(process.cwd(), "docs/statistics-queries.md"), "utf8");
  const queries: Record<string, string> = {};
  for (const [, body] of doc.matchAll(/```sql\n([\s\S]*?)```/g)) {
    const name = /^-- name: (\w+)/.exec(body!)?.[1];
    if (!name) throw new Error(`SQL block without a "-- name:" line:\n${body}`);
    queries[name] = body!;
  }
  return queries;
}

afterEach(() => {
  vi.useRealTimers();
});

// PRD section 7: the numbers on screen are reproducible from review_log with the documented queries.
test("the documented statistics queries reproduce GET /stats on the seeded history", async () => {
  const url = await freshDatabase(inject("testDatabaseUrl"), "flipside_stats_queries");
  vi.stubEnv("DATABASE_URL", url);
  const { runMigrations } = await import("@/server/db/migrate");
  const { getDb } = await import("@/server/db/client");
  const db = getDb();
  await runMigrations(db);
  const { seedStatsHistory, history } = await import("../helpers/stats-history");
  const { statsSchema } = await import("@/shared/schemas/stats");
  const { changeInWords } = await import("@/domain/stats");
  const route = await import("@/app/api/v1/stats/route");

  const q = await documentedQueries();
  expect(Object.keys(q).sort()).toEqual([
    "bars",
    "by_deck",
    "focus_next",
    "has_reviews",
    "tiles",
    "windows",
  ]);
  const sql = db.$client;
  const run = (name: string, params: (string | number)[]) => sql.unsafe(q[name]!, params);

  const { me, other } = await seedStatsHistory(db);
  // The route reads the clock itself; pin only Date so the database driver keeps its timers.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(history.now));

  for (const profile of [me, other]) {
    const p = [profile.id, profile.timezone, profile.dayStartHour] as const;
    for (const range of ["week", "month"] as const) {
      const res = await route.GET(
        new Request(`http://local/api/v1/stats?range=${range}`, {
          headers: { "x-profile-id": profile.id },
        }),
      );
      expect(res.status).toBe(200);
      const api = statsSchema.parse(await res.json());

      const [w] = await run("windows", [history.now, p[1], p[2], range === "week" ? 1 : 4]);
      expect(w!.today).toBe(api.today);
      expect({
        current: { start: w!.current_start, end: w!.current_end, days: w!.days },
        previous: { start: w!.previous_start, end: w!.previous_end, days: w!.days },
      }).toEqual(api.windows);

      const tiles = async (win: { start: string; end: string }) => {
        const [t] = await run("tiles", [...p, win.start, win.end]);
        return {
          cardsReviewed: t!.cards_reviewed,
          gotItRate: t!.got_it_rate,
          medianSeconds: t!.median_seconds,
          daysPractised: t!.days_practised,
          daysInWindow: t!.days_in_window,
        };
      };
      const current = await tiles(api.windows.current);
      const previous = await tiles(api.windows.previous);
      expect(current).toEqual(api.current);
      expect(previous).toEqual(api.previous);
      // Change lines are words over the tile figures, so the SQL figures give the same words.
      for (const m of ["cardsReviewed", "gotItRate", "timePerCard", "daysPractised"] as const)
        expect(changeInWords(m, current, previous, range)).toBe(api.changes[m]);

      const bars = await run("bars", [
        ...p,
        api.windows.current.start,
        api.windows.current.end,
        range === "week" ? 1 : 7,
        api.today,
      ]);
      expect(
        bars.map((b) => ({ start: b.start, cardsReviewed: b.cards_reviewed, current: b.current })),
      ).toEqual(api.bars);

      const focus = await run("focus_next", [profile.id]);
      expect(
        focus.map((t) => ({
          deckId: t.deck_id,
          deckName: t.deck_name,
          topic: t.topic,
          cards: t.cards,
          mastery: t.mastery,
          lapses: t.lapses,
        })),
      ).toEqual(api.focusNext);

      const byDeck = await run("by_deck", [
        ...p,
        api.windows.current.start,
        api.windows.current.end,
      ]);
      expect(
        byDeck.map((d) => ({
          deckId: d.deck_id,
          name: d.name,
          color: d.color,
          cards: d.cards,
          mastered: d.mastered,
          mastery: d.mastery,
          medianSeconds: d.median_seconds,
          lastPractisedAt: d.last_practised_at ? new Date(d.last_practised_at).toISOString() : null,
        })),
      ).toEqual(api.byDeck);

      const [h] = await run("has_reviews", [profile.id]);
      expect(h!.has_reviews).toBe(api.hasReviews);
    }
  }

  // Guard against a vacuous match: the seeded history gives the hand-computed AC8 figures.
  const week = await run("tiles", [
    me.id,
    me.timezone,
    me.dayStartHour,
    "2026-11-02",
    "2026-11-08",
  ]);
  expect(week[0]).toMatchObject({
    cards_reviewed: 6,
    got_it_rate: 0.5,
    median_seconds: 16,
    days_practised: 3,
  });
}, 30_000);
