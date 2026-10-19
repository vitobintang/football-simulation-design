import { integer, jsonb, pgTable, serial, timestamp } from "drizzle-orm/pg-core";

export const saves = pgTable("saves", {
  id: serial("id").primaryKey(),
  slot: integer("slot").notNull().default(1),
  data: jsonb("data").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
