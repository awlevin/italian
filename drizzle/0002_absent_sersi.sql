CREATE TABLE "added_phrase" (
	"id" text PRIMARY KEY NOT NULL,
	"query" text NOT NULL,
	"query_key" text NOT NULL,
	"status" text NOT NULL,
	"it" text,
	"en" text,
	"say" text,
	"note" text,
	"audio_url" text,
	"error" text,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "added_phrase_query_key_unique" UNIQUE("query_key")
);
--> statement-breakpoint
CREATE INDEX "added_phrase_created_by_idx" ON "added_phrase" USING btree ("created_by","created_at");