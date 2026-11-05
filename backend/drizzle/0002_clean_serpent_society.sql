CREATE TABLE "job_run" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_name" varchar(64) NOT NULL,
	"window_start" timestamp with time zone,
	"started_at" timestamp with time zone NOT NULL,
	"finished_at" timestamp with time zone NOT NULL,
	"status" varchar(32) NOT NULL,
	"summary" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job" (
	"name" varchar(64) PRIMARY KEY NOT NULL,
	"last_run_at" timestamp with time zone,
	"last_status" varchar(32),
	"next_due_at" timestamp with time zone NOT NULL,
	"consecutive_failures" integer DEFAULT 0 NOT NULL,
	"meta" jsonb
);
--> statement-breakpoint
CREATE TABLE "quota_usage" (
	"day" varchar(10) NOT NULL,
	"provider" varchar(32) NOT NULL,
	"used" integer DEFAULT 0 NOT NULL,
	"limit" integer NOT NULL,
	CONSTRAINT "quota_usage_day_provider_pk" PRIMARY KEY("day","provider")
);
--> statement-breakpoint
ALTER TABLE "job_run" ADD CONSTRAINT "job_run_job_name_job_name_fk" FOREIGN KEY ("job_name") REFERENCES "public"."job"("name") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "job_run_started_at_idx" ON "job_run" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "job_next_due_idx" ON "job" USING btree ("next_due_at");