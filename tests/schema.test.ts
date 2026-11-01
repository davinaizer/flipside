import { afterAll, beforeAll, expect, test } from "vitest";
import { inject } from "vitest";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const sql = postgres(inject("testDatabaseUrl"), { max: 1, onnotice: () => {} });

beforeAll(async () => {
  await migrate(drizzle(sql), {
    migrationsFolder: "./drizzle",
    migrationsTable: "schema_migrations",
    migrationsSchema: "public",
  });
});
afterAll(() => sql.end());

const rows = <T extends object>(q: Promise<unknown>) => q as Promise<T[]>;

async function columns(table: string): Promise<string[]> {
  const r = await rows<{ column_name: string }>(
    sql`select column_name from information_schema.columns where table_schema='public' and table_name=${table}`,
  );
  return r.map((x) => x.column_name);
}

const expected: Record<string, string[]> = {
  profiles: ["id", "name", "avatar", "accent", "timezone", "day_start_hour", "settings"],
  decks: ["id", "owner_profile_id", "name", "group_name", "color", "answer_style", "deleted_at"],
  cards: [
    "id",
    "deck_id",
    "external_id",
    "topic",
    "front",
    "back",
    "front_image_id",
    "back_image_id",
    "position",
    "deleted_at",
  ],
  images: ["id", "owner_profile_id", "sha256", "mime", "bytes", "width", "height", "storage_key"],
  card_state: [
    "profile_id",
    "card_id",
    "box",
    "due_date",
    "reps",
    "lapses",
    "last_grade",
    "last_reviewed_at",
    "status",
  ],
  review_log: [
    "id",
    "profile_id",
    "card_id",
    "session_id",
    "grade",
    "duration_ms",
    "reviewed_at",
    "is_first_attempt_today",
    "introduced_new",
    "box_before",
    "box_after",
    "due_after",
    "prev_state",
    "undone_at",
    "confidence",
    "meta",
  ],
  sessions: [
    "id",
    "profile_id",
    "scope",
    "planned_count",
    "started_at",
    "ended_at",
    "ended_reason",
    "meta",
  ],
  import_runs: [
    "id",
    "profile_id",
    "deck_id",
    "filename",
    "rows_total",
    "rows_added",
    "rows_updated",
    "rows_skipped",
    "warnings",
  ],
};

test("all nine tables exist, journal named schema_migrations", async () => {
  const r = await rows<{ table_name: string }>(
    sql`select table_name from information_schema.tables where table_schema='public'`,
  );
  const names = r.map((x) => x.table_name).sort();
  expect(names).toEqual([...Object.keys(expected), "schema_migrations"].sort());
  expect((await sql`select count(*)::int as n from public.schema_migrations`)[0].n).toBeGreaterThan(
    0,
  );
});

test.each(Object.entries(expected))(
  "%s has its section 10 columns and timestamps",
  async (t, cols) => {
    const have = await columns(t);
    for (const c of [...cols, "created_at", "updated_at"]) expect(have).toContain(c);
    if (t === "decks" || t === "cards") expect(have).toContain("deleted_at");
  },
);

test("meta on review_log and sessions", async () => {
  expect(await columns("review_log")).toContain("meta");
  expect(await columns("sessions")).toContain("meta");
});

async function constraints(table: string, type: string) {
  const r = await rows<{ def: string }>(
    sql`select pg_get_constraintdef(oid) as def from pg_constraint where conrelid=('public.'||${table})::regclass and contype=${type}`,
  );
  return r.map((x) => x.def);
}

test("unique constraints and composite primary key", async () => {
  expect(await constraints("cards", "u")).toContain("UNIQUE (deck_id, external_id)");
  expect(await constraints("images", "u")).toContain("UNIQUE (owner_profile_id, sha256)");
  expect(await constraints("card_state", "p")).toEqual(["PRIMARY KEY (profile_id, card_id)"]);
});

test("indexes on card_state, review_log and cards", async () => {
  const r = await rows<{ def: string }>(
    sql`select indexdef as def from pg_indexes where schemaname='public' and tablename in ('card_state','review_log','cards')`,
  );
  const defs = r.map((x) => x.def.replace(/^.*USING btree /, ""));
  expect(defs).toContain("(profile_id, due_date)");
  expect(defs).toContain("(profile_id, reviewed_at)");
  expect(defs).toContain("(profile_id, card_id, reviewed_at)");
  expect(defs).toContain("(deck_id, topic)");
});

test("box 0 and 6 are rejected, 1 and 5 accepted", async () => {
  const [p] = await sql`insert into profiles (id,name,avatar,accent,timezone,day_start_hour)
    values (gen_random_uuid(),'T','a','b','UTC',4) returning id`;
  const [d] =
    await sql`insert into decks (id,owner_profile_id,name) values (gen_random_uuid(),${p.id},'D') returning id`;
  const ins = async (box: number) => {
    const [c] = await sql`insert into cards (id,deck_id,external_id,topic,front,back)
      values (gen_random_uuid(),${d.id},${"e" + box + Math.random()},'t','f','b') returning id`;
    return sql`insert into card_state (profile_id,card_id,box,due_date) values (${p.id},${c.id},${box},'2026-01-01')`;
  };
  await expect(ins(0)).rejects.toThrow(/card_state_box_check/);
  await expect(ins(6)).rejects.toThrow(/card_state_box_check/);
  await ins(1);
  await ins(5);
});
