CREATE TABLE "card_state" (
	"profile_id" uuid NOT NULL,
	"card_id" uuid NOT NULL,
	"box" smallint NOT NULL,
	"due_date" date NOT NULL,
	"reps" integer DEFAULT 0 NOT NULL,
	"lapses" integer DEFAULT 0 NOT NULL,
	"last_grade" text,
	"last_reviewed_at" timestamp with time zone,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "card_state_pkey" PRIMARY KEY("profile_id","card_id"),
	CONSTRAINT "card_state_box_check" CHECK ("card_state"."box" between 1 and 5),
	CONSTRAINT "card_state_status_check" CHECK ("card_state"."status" in ('active','leech','suspended')),
	CONSTRAINT "card_state_last_grade_check" CHECK ("card_state"."last_grade" is null or "card_state"."last_grade" in ('not_yet','nearly','got_it'))
);
--> statement-breakpoint
CREATE TABLE "cards" (
	"id" uuid PRIMARY KEY NOT NULL,
	"deck_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"topic" text NOT NULL,
	"front" text NOT NULL,
	"back" text NOT NULL,
	"front_image_id" uuid,
	"back_image_id" uuid,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "cards_deck_external_unique" UNIQUE("deck_id","external_id")
);
--> statement-breakpoint
CREATE TABLE "decks" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_profile_id" uuid NOT NULL,
	"name" text NOT NULL,
	"group_name" text,
	"color" text,
	"answer_style" text DEFAULT 'paragraph' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "decks_answer_style_check" CHECK ("decks"."answer_style" in ('paragraph','bullets'))
);
--> statement-breakpoint
CREATE TABLE "images" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_profile_id" uuid NOT NULL,
	"sha256" text NOT NULL,
	"mime" text NOT NULL,
	"bytes" integer NOT NULL,
	"width" integer,
	"height" integer,
	"storage_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "images_owner_sha256_unique" UNIQUE("owner_profile_id","sha256")
);
--> statement-breakpoint
CREATE TABLE "import_runs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"profile_id" uuid NOT NULL,
	"deck_id" uuid NOT NULL,
	"filename" text NOT NULL,
	"rows_total" integer NOT NULL,
	"rows_added" integer NOT NULL,
	"rows_updated" integer NOT NULL,
	"rows_skipped" integer NOT NULL,
	"warnings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"avatar" text NOT NULL,
	"accent" text NOT NULL,
	"timezone" text NOT NULL,
	"day_start_hour" smallint NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_log" (
	"id" uuid PRIMARY KEY NOT NULL,
	"profile_id" uuid NOT NULL,
	"card_id" uuid NOT NULL,
	"session_id" uuid,
	"grade" text NOT NULL,
	"duration_ms" integer NOT NULL,
	"reviewed_at" timestamp with time zone NOT NULL,
	"is_first_attempt_today" boolean NOT NULL,
	"introduced_new" boolean DEFAULT false NOT NULL,
	"box_before" smallint,
	"box_after" smallint NOT NULL,
	"due_after" date NOT NULL,
	"prev_state" jsonb,
	"undone_at" timestamp with time zone,
	"confidence" smallint,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "review_log_grade_check" CHECK ("review_log"."grade" in ('not_yet','nearly','got_it')),
	CONSTRAINT "review_log_box_before_check" CHECK ("review_log"."box_before" is null or "review_log"."box_before" between 1 and 5),
	CONSTRAINT "review_log_box_after_check" CHECK ("review_log"."box_after" between 1 and 5)
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"profile_id" uuid NOT NULL,
	"scope" jsonb NOT NULL,
	"planned_count" integer NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"ended_reason" text,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_ended_reason_check" CHECK ("sessions"."ended_reason" is null or "sessions"."ended_reason" in ('completed','ended_early'))
);
--> statement-breakpoint
ALTER TABLE "card_state" ADD CONSTRAINT "card_state_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_state" ADD CONSTRAINT "card_state_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_deck_id_decks_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."decks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_front_image_id_images_id_fk" FOREIGN KEY ("front_image_id") REFERENCES "public"."images"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_back_image_id_images_id_fk" FOREIGN KEY ("back_image_id") REFERENCES "public"."images"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decks" ADD CONSTRAINT "decks_owner_profile_id_profiles_id_fk" FOREIGN KEY ("owner_profile_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "images" ADD CONSTRAINT "images_owner_profile_id_profiles_id_fk" FOREIGN KEY ("owner_profile_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_runs" ADD CONSTRAINT "import_runs_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_runs" ADD CONSTRAINT "import_runs_deck_id_decks_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."decks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_log" ADD CONSTRAINT "review_log_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_log" ADD CONSTRAINT "review_log_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_log" ADD CONSTRAINT "review_log_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "card_state_profile_due_idx" ON "card_state" USING btree ("profile_id","due_date");--> statement-breakpoint
CREATE INDEX "cards_deck_topic_idx" ON "cards" USING btree ("deck_id","topic");--> statement-breakpoint
CREATE INDEX "review_log_profile_reviewed_idx" ON "review_log" USING btree ("profile_id","reviewed_at");--> statement-breakpoint
CREATE INDEX "review_log_profile_card_reviewed_idx" ON "review_log" USING btree ("profile_id","card_id","reviewed_at");