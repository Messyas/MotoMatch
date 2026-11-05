import {
  halfvec,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { devices } from "../../catalog/infrastructure/catalog.schema";
import { reviews } from "../../reviews/infrastructure/reviews.schema";

export const evidenceSnippets = pgTable(
  "evidence_snippet",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reviewId: uuid("review_id")
      .references(() => reviews.id, { onDelete: "cascade" })
      .notNull(),
    chunkIndex: integer("chunk_index").notNull(),
    deviceId: uuid("device_id")
      .references(() => devices.id, { onDelete: "cascade" })
      .notNull(),
    aspect: varchar("aspect", { length: 50 }).notNull(),
    text: text("text").notNull(),
    sentiment: varchar("sentiment", { length: 20 })
      .default("positive")
      .notNull(),
    provider: varchar("provider", { length: 32 }).notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    embedding: halfvec("embedding", { dimensions: 768 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("evidence_snippet_review_chunk_idx").on(
      table.reviewId,
      table.chunkIndex,
    ),
    index("evidence_snippet_device_aspect_idx").on(
      table.deviceId,
      table.aspect,
    ),
    index("evidence_snippet_embedding_hnsw_idx").using(
      "hnsw",
      table.embedding.op("halfvec_cosine_ops"),
    ),
  ],
);

