CREATE TABLE "device_spec" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_id" uuid NOT NULL,
	"key" varchar(64) NOT NULL,
	"value_num" real,
	"value_text" text
);
--> statement-breakpoint
CREATE TABLE "device" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand" varchar(64) NOT NULL,
	"model" varchar(128) NOT NULL,
	"price_cents" integer NOT NULL,
	"photos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"source" varchar(32) DEFAULT 'manual' NOT NULL,
	"external_id" varchar(128),
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "device_spec" ADD CONSTRAINT "device_spec_device_id_device_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."device"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "device_spec_device_key_idx" ON "device_spec" USING btree ("device_id","key");--> statement-breakpoint
CREATE INDEX "device_spec_key_idx" ON "device_spec" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "device_brand_model_idx" ON "device" USING btree ("brand","model");--> statement-breakpoint
CREATE INDEX "device_active_idx" ON "device" USING btree ("active");