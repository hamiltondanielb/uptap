CREATE TABLE "card_prints_cache" (
	"id" text PRIMARY KEY NOT NULL,
	"oracle_id" text NOT NULL,
	"name" text NOT NULL,
	"set_code" text NOT NULL,
	"set_name" text NOT NULL,
	"collector_number" text NOT NULL,
	"rarity" text NOT NULL,
	"lang" text DEFAULT 'en' NOT NULL,
	"released_at" text,
	"image_small" text,
	"image_normal" text,
	"mana_cost" text,
	"type_line" text,
	"oracle_text" text,
	"colors" text,
	"color_identity" text,
	"cmc" double precision,
	"price_usd" double precision,
	"price_usd_foil" double precision,
	"layout" text DEFAULT 'normal' NOT NULL,
	"scryfall_updated_at" text,
	"cached_at" text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collection_import_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"source_type" text NOT NULL,
	"status" text NOT NULL,
	"total_rows" integer DEFAULT 0 NOT NULL,
	"matched_rows" integer DEFAULT 0 NOT NULL,
	"ambiguous_rows" integer DEFAULT 0 NOT NULL,
	"failed_rows" integer DEFAULT 0 NOT NULL,
	"created_at" text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	"completed_at" text
);
--> statement-breakpoint
CREATE TABLE "collection_import_rows" (
	"id" text PRIMARY KEY NOT NULL,
	"job_id" text NOT NULL,
	"original" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"name" text NOT NULL,
	"set_code" text,
	"collector_number" text,
	"finish" text,
	"status" text NOT NULL,
	"resolved_print_id" text,
	"error_message" text
);
--> statement-breakpoint
CREATE TABLE "collection_items" (
	"id" text PRIMARY KEY NOT NULL,
	"print_id" text NOT NULL,
	"quantity_total" integer DEFAULT 0 NOT NULL,
	"quantity_available" integer DEFAULT 0 NOT NULL,
	"finish" text DEFAULT 'nonfoil' NOT NULL,
	"condition" text DEFAULT 'near_mint' NOT NULL,
	"language" text,
	"is_signed" boolean DEFAULT false NOT NULL,
	"is_altered" boolean DEFAULT false NOT NULL,
	"is_proxy" boolean DEFAULT false NOT NULL,
	"purchase_price_cents" integer,
	"acquired_at" text,
	"location" text,
	"notes" text,
	"updated_at" text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deck_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"deck_id" text NOT NULL,
	"print_id" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"section" text DEFAULT 'mainboard' NOT NULL,
	"is_maybeboard" boolean DEFAULT false NOT NULL,
	"use_collection" boolean DEFAULT true NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "deck_tags" (
	"deck_id" text NOT NULL,
	"tag_id" text NOT NULL,
	CONSTRAINT "deck_tags_deck_id_tag_id_pk" PRIMARY KEY("deck_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "decks" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"format" text NOT NULL,
	"description" text,
	"notes" text,
	"commander_print_id" text,
	"is_archived" boolean DEFAULT false NOT NULL,
	"created_at" text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	"updated_at" text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"color" text,
	CONSTRAINT "tags_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "collection_import_rows" ADD CONSTRAINT "collection_import_rows_job_id_collection_import_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."collection_import_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items_print_id_card_prints_cache_id_fk" FOREIGN KEY ("print_id") REFERENCES "public"."card_prints_cache"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deck_entries" ADD CONSTRAINT "deck_entries_deck_id_decks_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."decks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deck_entries" ADD CONSTRAINT "deck_entries_print_id_card_prints_cache_id_fk" FOREIGN KEY ("print_id") REFERENCES "public"."card_prints_cache"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deck_tags" ADD CONSTRAINT "deck_tags_deck_id_decks_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."decks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deck_tags" ADD CONSTRAINT "deck_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decks" ADD CONSTRAINT "decks_commander_print_id_card_prints_cache_id_fk" FOREIGN KEY ("commander_print_id") REFERENCES "public"."card_prints_cache"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "card_prints_cache_oracle_idx" ON "card_prints_cache" USING btree ("oracle_id");--> statement-breakpoint
CREATE INDEX "card_prints_cache_name_idx" ON "card_prints_cache" USING btree ("name");--> statement-breakpoint
CREATE INDEX "collection_import_rows_job_idx" ON "collection_import_rows" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "collection_items_print_idx" ON "collection_items" USING btree ("print_id");--> statement-breakpoint
CREATE INDEX "deck_entries_deck_idx" ON "deck_entries" USING btree ("deck_id");--> statement-breakpoint
CREATE INDEX "deck_entries_print_idx" ON "deck_entries" USING btree ("print_id");--> statement-breakpoint
CREATE INDEX "decks_updated_idx" ON "decks" USING btree ("updated_at");