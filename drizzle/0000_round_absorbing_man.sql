CREATE TABLE "answer_log" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"item_id" text NOT NULL,
	"correct" boolean NOT NULL,
	"at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "item_state" (
	"user_id" text NOT NULL,
	"item_id" text NOT NULL,
	"box" integer DEFAULT 0 NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"correct" integer DEFAULT 0 NOT NULL,
	"wrong" integer DEFAULT 0 NOT NULL,
	"last_at" timestamp with time zone NOT NULL,
	CONSTRAINT "item_state_user_id_item_id_pk" PRIMARY KEY("user_id","item_id")
);
--> statement-breakpoint
CREATE TABLE "lesson_progress" (
	"user_id" text NOT NULL,
	"lesson_id" text NOT NULL,
	"step_index" integer DEFAULT 0 NOT NULL,
	"completed_at" timestamp with time zone,
	"best_accuracy" real,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "lesson_progress_user_id_lesson_id_pk" PRIMARY KEY("user_id","lesson_id")
);
--> statement-breakpoint
CREATE TABLE "starred_phrase" (
	"user_id" text NOT NULL,
	"phrase_id" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "starred_phrase_user_id_phrase_id_pk" PRIMARY KEY("user_id","phrase_id")
);
--> statement-breakpoint
CREATE INDEX "answer_log_user_at_idx" ON "answer_log" USING btree ("user_id","at");--> statement-breakpoint
CREATE INDEX "item_state_due_idx" ON "item_state" USING btree ("user_id","due_at");