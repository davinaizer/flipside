import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { uuidv7 } from "@/shared/uuid";

const id = () =>
  uuid("id")
    .primaryKey()
    .$defaultFn(() => uuidv7());
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());
const deletedAt = () => timestamp("deleted_at", { withTimezone: true });

export const accounts = pgTable("accounts", {
  id: id(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const signInTokens = pgTable("sign_in_tokens", {
  id: id(),
  accountId: uuid("account_id")
    .notNull()
    .references(() => accounts.id),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: createdAt(),
});

export const signInAttempts = pgTable(
  "sign_in_attempts",
  {
    id: id(),
    email: text("email").notNull(),
    succeeded: boolean("succeeded").notNull(),
    attemptedAt: timestamp("attempted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sign_in_attempts_email_attempted_at_idx").on(t.email, t.attemptedAt)],
);

export const profiles = pgTable("profiles", {
  id: id(),
  // Nullable until existing profiles are adopted by an account (AU6).
  accountId: uuid("account_id").references(() => accounts.id),
  name: text("name").notNull(),
  avatar: text("avatar").notNull(),
  accent: text("accent").notNull(),
  timezone: text("timezone").notNull(),
  dayStartHour: smallint("day_start_hour").notNull(),
  settings: jsonb("settings").notNull().default({}),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const decks = pgTable(
  "decks",
  {
    id: id(),
    ownerProfileId: uuid("owner_profile_id")
      .notNull()
      .references(() => profiles.id),
    name: text("name").notNull(),
    groupName: text("group_name"),
    color: text("color"),
    answerStyle: text("answer_style").notNull().default("paragraph"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (t) => [check("decks_answer_style_check", sql`${t.answerStyle} in ('paragraph','bullets')`)],
);

export const images = pgTable(
  "images",
  {
    id: id(),
    ownerProfileId: uuid("owner_profile_id")
      .notNull()
      .references(() => profiles.id),
    sha256: text("sha256").notNull(),
    mime: text("mime").notNull(),
    bytes: integer("bytes").notNull(),
    width: integer("width"),
    height: integer("height"),
    storageKey: text("storage_key").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [unique("images_owner_sha256_unique").on(t.ownerProfileId, t.sha256)],
);

export const cards = pgTable(
  "cards",
  {
    id: id(),
    deckId: uuid("deck_id")
      .notNull()
      .references(() => decks.id),
    externalId: text("external_id").notNull(),
    topic: text("topic").notNull(),
    front: text("front").notNull(),
    back: text("back").notNull(),
    frontImageId: uuid("front_image_id").references(() => images.id),
    backImageId: uuid("back_image_id").references(() => images.id),
    position: integer("position").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (t) => [
    unique("cards_deck_external_unique").on(t.deckId, t.externalId),
    index("cards_deck_topic_idx").on(t.deckId, t.topic),
  ],
);

export const cardState = pgTable(
  "card_state",
  {
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id),
    cardId: uuid("card_id")
      .notNull()
      .references(() => cards.id),
    box: smallint("box").notNull(),
    dueDate: date("due_date", { mode: "string" }).notNull(),
    reps: integer("reps").notNull().default(0),
    lapses: integer("lapses").notNull().default(0),
    lastGrade: text("last_grade"),
    lastReviewedAt: timestamp("last_reviewed_at", { withTimezone: true }),
    status: text("status").notNull().default("active"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    primaryKey({ name: "card_state_pkey", columns: [t.profileId, t.cardId] }),
    index("card_state_profile_due_idx").on(t.profileId, t.dueDate),
    check("card_state_box_check", sql`${t.box} between 1 and 5`),
    check("card_state_status_check", sql`${t.status} in ('active','leech','suspended')`),
    check(
      "card_state_last_grade_check",
      sql`${t.lastGrade} is null or ${t.lastGrade} in ('not_yet','nearly','got_it')`,
    ),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id),
    scope: jsonb("scope").notNull(),
    plannedCount: integer("planned_count").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    endedReason: text("ended_reason"),
    meta: jsonb("meta").notNull().default({}),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check(
      "sessions_ended_reason_check",
      sql`${t.endedReason} is null or ${t.endedReason} in ('completed','ended_early')`,
    ),
  ],
);

export const reviewLog = pgTable(
  "review_log",
  {
    id: uuid("id").primaryKey(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id),
    cardId: uuid("card_id")
      .notNull()
      .references(() => cards.id),
    sessionId: uuid("session_id").references(() => sessions.id),
    grade: text("grade").notNull(),
    durationMs: integer("duration_ms").notNull(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }).notNull(),
    isFirstAttemptToday: boolean("is_first_attempt_today").notNull(),
    introducedNew: boolean("introduced_new").notNull().default(false),
    boxBefore: smallint("box_before"),
    boxAfter: smallint("box_after").notNull(),
    dueAfter: date("due_after", { mode: "string" }).notNull(),
    prevState: jsonb("prev_state"),
    undoneAt: timestamp("undone_at", { withTimezone: true }),
    confidence: smallint("confidence"),
    meta: jsonb("meta").notNull().default({}),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("review_log_profile_reviewed_idx").on(t.profileId, t.reviewedAt),
    index("review_log_profile_card_reviewed_idx").on(t.profileId, t.cardId, t.reviewedAt),
    check("review_log_grade_check", sql`${t.grade} in ('not_yet','nearly','got_it')`),
    check(
      "review_log_box_before_check",
      sql`${t.boxBefore} is null or ${t.boxBefore} between 1 and 5`,
    ),
    check("review_log_box_after_check", sql`${t.boxAfter} between 1 and 5`),
  ],
);

export const importRuns = pgTable("import_runs", {
  id: id(),
  profileId: uuid("profile_id")
    .notNull()
    .references(() => profiles.id),
  deckId: uuid("deck_id")
    .notNull()
    .references(() => decks.id),
  filename: text("filename").notNull(),
  rowsTotal: integer("rows_total").notNull(),
  rowsAdded: integer("rows_added").notNull(),
  rowsUpdated: integer("rows_updated").notNull(),
  rowsSkipped: integer("rows_skipped").notNull(),
  warnings: jsonb("warnings").notNull().default([]),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});
