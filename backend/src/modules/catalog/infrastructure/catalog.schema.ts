import { boolean, index, integer, jsonb, pgTable, real, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";

export const devices = pgTable(
  "device",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    brand: varchar("brand", { length: 64 }).notNull(),
    model: varchar("model", { length: 128 }).notNull(),
    priceCents: integer("price_cents").notNull(),
    photos: jsonb("photos").$type<string[]>().default([]).notNull(),
    source: varchar("source", { length: 32 }).default("manual").notNull(),
    externalId: varchar("external_id", { length: 128 }),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("device_brand_model_idx").on(table.brand, table.model),
    index("device_active_idx").on(table.active),
  ],
);

export const deviceSpecs = pgTable(
  "device_spec",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    deviceId: uuid("device_id")
      .references(() => devices.id, { onDelete: "cascade" })
      .notNull(),
    key: varchar("key", { length: 64 }).notNull(),
    valueNum: real("value_num"),
    valueText: text("value_text"),
  },
  (table) => [
    uniqueIndex("device_spec_device_key_idx").on(table.deviceId, table.key),
    index("device_spec_key_idx").on(table.key),
  ],
);
