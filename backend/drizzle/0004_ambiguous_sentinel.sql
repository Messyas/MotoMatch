CREATE TABLE "evidence_snippet" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_id" uuid NOT NULL,
	"chunk_index" integer NOT NULL,
	"device_id" uuid NOT NULL,
	"aspect" varchar(50) NOT NULL,
	"text" text NOT NULL,
	"sentiment" varchar(20) DEFAULT 'positive' NOT NULL,
	"provider" varchar(32) NOT NULL,
	"published_at" timestamp with time zone,
	"embedding" "halfvec(768)",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "evidence_snippet" ADD CONSTRAINT "evidence_snippet_review_id_review_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."review"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_snippet" ADD CONSTRAINT "evidence_snippet_device_id_device_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."device"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "evidence_snippet_review_chunk_idx" ON "evidence_snippet" USING btree ("review_id","chunk_index");--> statement-breakpoint
CREATE INDEX "evidence_snippet_device_aspect_idx" ON "evidence_snippet" USING btree ("device_id","aspect");--> statement-breakpoint
CREATE INDEX "evidence_snippet_embedding_hnsw_idx" ON "evidence_snippet" USING hnsw ("embedding" halfvec_cosine_ops);