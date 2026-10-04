import { sqliteTable, text, integer, uniqueIndex, index } from "drizzle-orm/sqlite-core";

export const events = sqliteTable("events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  dateTime: integer("date_time").notNull(), // Unix timestamp (ms)
  capacity: integer("capacity").notNull(),
  reminder24hSent: integer("reminder_24h_sent", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const registrations = sqliteTable(
  "registrations",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    eventId: integer("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    status: text("status", { enum: ["CONFIRMED", "WAITLIST", "CANCELLED"] }).notNull(),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("event_email_unique_idx").on(table.eventId, table.email),
    index("event_status_idx").on(table.eventId, table.status),
    index("event_waitlist_order_idx").on(table.eventId, table.status, table.createdAt),
  ]
);

export const tickets = sqliteTable(
  "tickets",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    registrationId: integer("registration_id")
      .notNull()
      .references(() => registrations.id, { onDelete: "cascade" }),
    eventId: integer("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    code: text("code").notNull().unique(),
    status: text("status", { enum: ["ISSUED", "CHECKED_IN", "REVOKED"] })
      .notNull()
      .default("ISSUED"),
    checkedInAt: integer("checked_in_at"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("ticket_code_unique_idx").on(table.code),
    index("ticket_event_status_idx").on(table.eventId, table.status),
  ]
);

export const mailLogs = sqliteTable(
  "mail_logs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    eventId: integer("event_id").references(() => events.id, { onDelete: "cascade" }),
    recipient: text("recipient").notNull(),
    subject: text("subject").notNull(),
    body: text("body").notNull(),
    type: text("type", {
      enum: ["TICKET", "WAITLIST_JOIN", "WAITLIST_PROMOTED", "REMINDER_24H", "RESCHEDULED"],
    }).notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    index("mail_event_idx").on(table.eventId),
    index("mail_recipient_idx").on(table.recipient),
  ]
);

export type Event = typeof events.$inferSelect;
export type InsertEvent = typeof events.$inferInsert;
export type Registration = typeof registrations.$inferSelect;
export type InsertRegistration = typeof registrations.$inferInsert;
export type Ticket = typeof tickets.$inferSelect;
export type InsertTicket = typeof tickets.$inferInsert;
export type MailLog = typeof mailLogs.$inferSelect;
