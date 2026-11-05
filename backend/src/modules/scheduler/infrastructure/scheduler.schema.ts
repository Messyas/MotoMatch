import {
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const jobs = pgTable(
  "job",
  {
    name: varchar("name", { length: 64 }).primaryKey(),
    lastRunAt: timestamp("last_run_at", { withTimezone: true }),
    lastStatus: varchar("last_status", { length: 32 }),
    nextDueAt: timestamp("next_due_at", { withTimezone: true }).notNull(),
    consecutiveFailures: integer("consecutive_failures").default(0).notNull(),
    meta: jsonb("meta"),
  },
  (table) => [index("job_next_due_idx").on(table.nextDueAt)],
);

export const jobRuns = pgTable(
  "job_run",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobName: varchar("job_name", { length: 64 })
      .references(() => jobs.name, { onDelete: "cascade" })
      .notNull(),
    windowStart: timestamp("window_start", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    finishedAt: timestamp("finished_at", { withTimezone: true }).notNull(),
    status: varchar("status", { length: 32 }).notNull(),
    summary: jsonb("summary").default({}).notNull(),
  },
  (table) => [index("job_run_started_at_idx").on(table.startedAt)],
);

export const quotaUsages = pgTable(
  "quota_usage",
  {
    day: varchar("day", { length: 10 }).notNull(), // YYYY-MM-DD
    provider: varchar("provider", { length: 32 }).notNull(),
    used: integer("used").default(0).notNull(),
    limit: integer("limit").notNull(),
  },
  (table) => [primaryKey({ columns: [table.day, table.provider] })],
);
