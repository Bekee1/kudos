import { createInsertSchema } from "drizzle-zod";
import { integer, pgTable, serial, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const colleaguesTable = pgTable("colleagues", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  initials: text("initials").notNull(),
  isAdmin: boolean("is_admin").notNull().default(false),
});

export const kudosTable = pgTable("kudos", {
  id: serial("id").primaryKey(),
  senderName: text("sender_name").notNull().default("You"),
  recipientId: integer("recipient_id").notNull().references(() => colleaguesTable.id),
  message: text("message").notNull(),
  status: text("status").notNull().default("approved"),
  isVisible: boolean("is_visible").notNull().default(true),
  reportReason: text("report_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  moderatedAt: timestamp("moderated_at", { withTimezone: true }),
});

export const insertColleagueSchema = createInsertSchema(colleaguesTable).omit({ id: true });
export const insertKudoSchema = createInsertSchema(kudosTable).omit({
  id: true,
  createdAt: true,
  moderatedAt: true,
});

export type InsertColleague = z.infer<typeof insertColleagueSchema>;
export type InsertKudo = z.infer<typeof insertKudoSchema>;
export type Colleague = typeof colleaguesTable.$inferSelect;
export type Kudo = typeof kudosTable.$inferSelect;