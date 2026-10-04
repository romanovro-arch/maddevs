import { db } from "../db";
import { events, registrations, tickets } from "../db/schema";
import { eq, and, sql, desc, count } from "drizzle-orm";
import { MailService } from "./mail.service";
import { broadcastEventStats } from "../ws/live-stats";

export interface CreateEventInput {
  title: string;
  description: string;
  dateTime: number; // Unix timestamp in ms
  capacity: number;
}

export interface UpdateEventInput {
  title?: string;
  description?: string;
  dateTime?: number;
  capacity?: number;
}

export class EventService {
  static async createEvent(input: CreateEventInput) {
    const now = Date.now();
    const [event] = await db
      .insert(events)
      .values({
        title: input.title,
        description: input.description,
        dateTime: input.dateTime,
        capacity: input.capacity,
        reminder24hSent: false,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return event;
  }

  static async getEvent(id: number) {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    return event || null;
  }

  static async listEvents() {
    const allEvents = await db.select().from(events).orderBy(desc(events.createdAt));

    const eventsWithStats = await Promise.all(
      allEvents.map(async (ev) => {
        const stats = await this.getEventStats(ev.id);
        return {
          ...ev,
          stats,
        };
      })
    );

    return eventsWithStats;
  }

  static async getEventStats(eventId: number) {
    const [event] = await db.select().from(events).where(eq(events.id, eventId));
    if (!event) return null;

    // Count confirmed
    const [confirmedRes] = await db
      .select({ count: count() })
      .from(registrations)
      .where(and(eq(registrations.eventId, eventId), eq(registrations.status, "CONFIRMED")));

    // Count waitlist
    const [waitlistRes] = await db
      .select({ count: count() })
      .from(registrations)
      .where(and(eq(registrations.eventId, eventId), eq(registrations.status, "WAITLIST")));

    // Count checked-in
    const [checkedInRes] = await db
      .select({ count: count() })
      .from(tickets)
      .where(and(eq(tickets.eventId, eventId), eq(tickets.status, "CHECKED_IN")));

    return {
      eventId,
      capacity: event.capacity,
      confirmedCount: confirmedRes?.count || 0,
      waitlistCount: waitlistRes?.count || 0,
      checkedInCount: checkedInRes?.count || 0,
      seatsLeft: Math.max(0, event.capacity - (confirmedRes?.count || 0)),
    };
  }

  static async updateEvent(id: number, input: UpdateEventInput) {
    const current = await this.getEvent(id);
    if (!current) throw new Error("Event not found");

    const now = Date.now();
    const dateChanged = input.dateTime !== undefined && input.dateTime !== current.dateTime;

    let reminder24hSent = current.reminder24hSent;
    if (dateChanged && input.dateTime! > now + 24 * 60 * 60 * 1000) {
      // Reset reminder flag if the new date is more than 24 hours in the future
      reminder24hSent = false;
    }

    const [updated] = await db
      .update(events)
      .set({
        title: input.title ?? current.title,
        description: input.description ?? current.description,
        dateTime: input.dateTime ?? current.dateTime,
        capacity: input.capacity ?? current.capacity,
        reminder24hSent,
        updatedAt: now,
      })
      .where(eq(events.id, id))
      .returning();

    // If date has changed, notify ALL registered and waitlisted participants
    if (dateChanged) {
      const activeRegistrations = await db
        .select()
        .from(registrations)
        .where(
          and(
            eq(registrations.eventId, id),
            sql`${registrations.status} IN ('CONFIRMED', 'WAITLIST')`
          )
        );

      const formattedNewDate = new Date(updated.dateTime).toLocaleString("ru-RU", {
        timeZone: "UTC",
        dateStyle: "full",
        timeStyle: "short",
      });

      for (const reg of activeRegistrations) {
        await MailService.sendMail({
          eventId: id,
          recipient: reg.email,
          type: "RESCHEDULED",
          eventTitle: updated.title,
          eventDateFormatted: formattedNewDate,
          newDateFormatted: formattedNewDate,
        });
      }
    }

    const stats = await this.getEventStats(id);
    broadcastEventStats(id, { type: "EVENT_UPDATED", event: updated, stats });

    return updated;
  }

  static async getEventParticipants(eventId: number) {
    // Return all confirmed & waitlist with their tickets
    const regs = await db
      .select({
        id: registrations.id,
        email: registrations.email,
        status: registrations.status,
        createdAt: registrations.createdAt,
        ticketCode: tickets.code,
        ticketStatus: tickets.status,
        checkedInAt: tickets.checkedInAt,
      })
      .from(registrations)
      .leftJoin(tickets, eq(tickets.registrationId, registrations.id))
      .where(eq(registrations.eventId, eventId))
      .orderBy(registrations.createdAt);

    return regs;
  }
}
