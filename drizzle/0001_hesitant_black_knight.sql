-- Scope answer_log ids to their user: a client-chosen id can no longer collide across users.
ALTER TABLE "answer_log" DROP CONSTRAINT "answer_log_pkey";--> statement-breakpoint
ALTER TABLE "answer_log" ADD CONSTRAINT "answer_log_user_id_id_pk" PRIMARY KEY("user_id","id");
