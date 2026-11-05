import {
  index,
  integer,
  pgTable,
  primaryKey,
  real,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { devices } from "../../catalog/infrastructure/catalog.schema";

export const reviewSourceLinks = pgTable(
  "review_source_link",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    deviceId: uuid("device_id")
      .references(() => devices.id, { onDelete: "cascade" })
      .notNull(),
    provider: varchar("provider", { length: 32 }).notNull(),
    externalRef: varchar("external_ref", { length: 256 }).notNull(),
    cursor: text("cursor"),
    nextDueAt: timestamp("next_due_at", { withTimezone: true }).notNull(),
    intervalDays: integer("interval_days").default(1).notNull(),
    lastNewCount: integer("last_new_count").default(0).notNull(),
  },
  (table) => [
    uniqueIndex("review_source_link_provider_ref_idx").on(
      table.provider,
      table.externalRef,
    ),
    index("review_source_link_next_due_idx").on(table.nextDueAt),
    index("review_source_link_device_idx").on(table.deviceId),
  ],
);

export const reviews = pgTable(
  "review",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    deviceId: uuid("device_id")
      .references(() => devices.id, { onDelete: "cascade" })
      .notNull(),
    provider: varchar("provider", { length: 32 }).notNull(),
    externalRef: varchar("external_ref", { length: 256 }).notNull(),
    authorHash: varchar("author_hash", { length: 128 }),
    rating: smallint("rating"),
    content: text("content").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    videoPhase: varchar("video_phase", { length: 32 })
      .default("unknown")
      .notNull(),
    daysSinceLaunch: integer("days_since_launch"),
    status: varchar("status", { length: 32 }).default("pending").notNull(),
    leaseUntil: timestamp("lease_until", { withTimezone: true }),
    attempts: integer("attempts").default(0).notNull(),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }),
    errorCode: varchar("error_code", { length: 64 }),
    errorMessage: text("error_message"),
    analyzedAt: timestamp("analyzed_at", { withTimezone: true }),
    aggregatedAt: timestamp("aggregated_at", { withTimezone: true }),
    contentPurgedAt: timestamp("content_purged_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("review_provider_external_ref_idx").on(
      table.provider,
      table.externalRef,
    ),
    index("review_status_lease_idx").on(table.status, table.leaseUntil),
    index("review_device_aggregated_idx").on(
      table.deviceId,
      table.aggregatedAt,
    ),
  ],
);

export const reviewAspects = pgTable(
  "review_aspect",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reviewId: uuid("review_id")
      .references(() => reviews.id, { onDelete: "cascade" })
      .notNull(),
    aspect: varchar("aspect", { length: 64 }).notNull(),
    score: smallint("score").notNull(),
    sentiment: varchar("sentiment", { length: 32 }).notNull(),
    confidence: real("confidence").default(1.0).notNull(),
  },
  (table) => [
    uniqueIndex("review_aspect_review_aspect_idx").on(
      table.reviewId,
      table.aspect,
    ),
    index("review_aspect_aspect_idx").on(table.aspect),
  ],
);

export const deviceAspectStats = pgTable(
  "device_aspect_stats",
  {
    deviceId: uuid("device_id")
      .references(() => devices.id, { onDelete: "cascade" })
      .notNull(),
    aspect: varchar("aspect", { length: 64 }).notNull(),
    sumW: real("sum_w").default(0.0).notNull(),
    sumWx: real("sum_wx").default(0.0).notNull(),
    n: integer("n").default(0).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.deviceId, table.aspect] }),
    index("device_aspect_stats_aspect_idx").on(table.aspect),
  ],
);
