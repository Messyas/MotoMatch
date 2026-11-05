import {
  index,
  jsonb,
  pgTable,
  primaryKey,
  real,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { devices } from "../../catalog/infrastructure/catalog.schema";

export const searchEvents = pgTable(
  "search_event",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: varchar("session_id", { length: 64 }).notNull(),
    intentSig: varchar("intent_sig", { length: 128 }).notNull(),
    criteria: jsonb("criteria").default({}).notNull(),
    discarded: jsonb("discarded").default({}).notNull(),
    resultIds: jsonb("result_ids").$type<string[]>().default([]).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("search_event_created_at_idx").on(table.createdAt)],
);

export const feedbackEvents = pgTable(
  "feedback_event",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: varchar("session_id", { length: 64 }).notNull(),
    deviceId: uuid("device_id")
      .references(() => devices.id, { onDelete: "cascade" })
      .notNull(),
    intentSig: varchar("intent_sig", { length: 128 }).notNull(),
    kind: varchar("kind", { length: 32 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("feedback_event_created_at_idx").on(table.createdAt),
    index("feedback_event_device_idx").on(table.deviceId),
  ],
);

export const collectiveScores = pgTable(
  "collective_score",
  {
    deviceId: uuid("device_id")
      .references(() => devices.id, { onDelete: "cascade" })
      .notNull(),
    intentSig: varchar("intent_sig", { length: 128 }).notNull(),
    alpha: real("alpha").default(1.0).notNull(),
    beta: real("beta").default(1.0).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.deviceId, table.intentSig] }),
    index("collective_score_device_idx").on(table.deviceId),
  ],
);

export const analyticsDaily = pgTable(
  "analytics_daily",
  {
    day: varchar("day", { length: 10 }).notNull(),
    metric: varchar("metric", { length: 64 }).notNull(),
    dim: varchar("dim", { length: 128 }).notNull(),
    value: real("value").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.day, table.metric, table.dim] }),
    index("analytics_daily_day_idx").on(table.day),
  ],
);

