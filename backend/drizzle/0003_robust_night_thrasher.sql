CREATE TABLE "analytics_daily" (
	"day" varchar(10) NOT NULL,
	"metric" varchar(64) NOT NULL,
	"dim" varchar(128) NOT NULL,
	"value" real NOT NULL,
	CONSTRAINT "analytics_daily_day_metric_dim_pk" PRIMARY KEY("day","metric","dim")
);
--> statement-breakpoint
CREATE TABLE "collective_score" (
	"device_id" uuid NOT NULL,
	"intent_sig" varchar(128) NOT NULL,
	"alpha" real DEFAULT 1 NOT NULL,
	"beta" real DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "collective_score_device_id_intent_sig_pk" PRIMARY KEY("device_id","intent_sig")
);
--> statement-breakpoint
CREATE TABLE "feedback_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar(64) NOT NULL,
	"device_id" uuid NOT NULL,
	"intent_sig" varchar(128) NOT NULL,
	"kind" varchar(32) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "search_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar(64) NOT NULL,
	"intent_sig" varchar(128) NOT NULL,
	"criteria" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"discarded" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"result_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "collective_score" ADD CONSTRAINT "collective_score_device_id_device_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."device"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_event" ADD CONSTRAINT "feedback_event_device_id_device_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."device"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "analytics_daily_day_idx" ON "analytics_daily" USING btree ("day");--> statement-breakpoint
CREATE INDEX "collective_score_device_idx" ON "collective_score" USING btree ("device_id");--> statement-breakpoint
CREATE INDEX "feedback_event_created_at_idx" ON "feedback_event" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "feedback_event_device_idx" ON "feedback_event" USING btree ("device_id");--> statement-breakpoint
CREATE INDEX "search_event_created_at_idx" ON "search_event" USING btree ("created_at");