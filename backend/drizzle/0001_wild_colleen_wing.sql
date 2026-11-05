CREATE TABLE "device_aspect_stats" (
	"device_id" uuid NOT NULL,
	"aspect" varchar(64) NOT NULL,
	"sum_w" real DEFAULT 0 NOT NULL,
	"sum_wx" real DEFAULT 0 NOT NULL,
	"n" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "device_aspect_stats_device_id_aspect_pk" PRIMARY KEY("device_id","aspect")
);
--> statement-breakpoint
CREATE TABLE "review_aspect" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_id" uuid NOT NULL,
	"aspect" varchar(64) NOT NULL,
	"score" smallint NOT NULL,
	"sentiment" varchar(32) NOT NULL,
	"confidence" real DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_source_link" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_id" uuid NOT NULL,
	"provider" varchar(32) NOT NULL,
	"external_ref" varchar(256) NOT NULL,
	"cursor" text,
	"next_due_at" timestamp with time zone NOT NULL,
	"interval_days" integer DEFAULT 1 NOT NULL,
	"last_new_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_id" uuid NOT NULL,
	"provider" varchar(32) NOT NULL,
	"external_ref" varchar(256) NOT NULL,
	"author_hash" varchar(128),
	"rating" smallint,
	"content" text NOT NULL,
	"published_at" timestamp with time zone,
	"video_phase" varchar(32) DEFAULT 'unknown' NOT NULL,
	"days_since_launch" integer,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"lease_until" timestamp with time zone,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone,
	"error_code" varchar(64),
	"error_message" text,
	"analyzed_at" timestamp with time zone,
	"aggregated_at" timestamp with time zone,
	"content_purged_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "device_aspect_stats" ADD CONSTRAINT "device_aspect_stats_device_id_device_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."device"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_aspect" ADD CONSTRAINT "review_aspect_review_id_review_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."review"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_source_link" ADD CONSTRAINT "review_source_link_device_id_device_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."device"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review" ADD CONSTRAINT "review_device_id_device_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."device"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "device_aspect_stats_aspect_idx" ON "device_aspect_stats" USING btree ("aspect");--> statement-breakpoint
CREATE UNIQUE INDEX "review_aspect_review_aspect_idx" ON "review_aspect" USING btree ("review_id","aspect");--> statement-breakpoint
CREATE INDEX "review_aspect_aspect_idx" ON "review_aspect" USING btree ("aspect");--> statement-breakpoint
CREATE UNIQUE INDEX "review_source_link_provider_ref_idx" ON "review_source_link" USING btree ("provider","external_ref");--> statement-breakpoint
CREATE INDEX "review_source_link_next_due_idx" ON "review_source_link" USING btree ("next_due_at");--> statement-breakpoint
CREATE INDEX "review_source_link_device_idx" ON "review_source_link" USING btree ("device_id");--> statement-breakpoint
CREATE UNIQUE INDEX "review_provider_external_ref_idx" ON "review" USING btree ("provider","external_ref");--> statement-breakpoint
CREATE INDEX "review_status_lease_idx" ON "review" USING btree ("status","lease_until");--> statement-breakpoint
CREATE INDEX "review_device_aggregated_idx" ON "review" USING btree ("device_id","aggregated_at");