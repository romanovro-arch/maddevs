import { db, sqlite } from "../db";
import { events, registrations, tickets } from "../db/schema";
import { eq, and, sql, count, asc } from "drizzle-orm";
import { generateTicketCode } from "../utils/code-generator";
import { MailService } from "./mail.service";
import { EventService } from "./event.service";
import { broadcastEventStats } from "../ws/live-stats";

export interface RegisterInput {
  eventId: number;
  email: string;
}

export class RegistrationService {
  static async register(input: RegisterInput) {
    const email = input.email.toLowerCase().trim();
    const eventId = input.eventId;

    const event = await EventService.getEvent(eventId);
    if (!event) throw new Error("Event not found");

    const formattedDate = new Date(event.dateTime).toLocaleString("ru-RU", {
      timeZone: "UTC",
      dateStyle: "full",
      timeStyle: "short",
    });

    // Check if user already registered for this event
    const [existing] = await db
      .select()
      .from(registrations)
      .where(and(eq(registrations.eventId, eventId), eq(registrations.email, email)));

    if (existing) {
      if (existing.status === "CONFIRMED") {
        const [ticket] = await db
          .select()
          .from(tickets)
          .where(eq(tickets.registrationId, existing.id));

        return {
          status: "CONFIRMED" as const,
          alreadyRegistered: true,
          registration: existing,
          ticketCode: ticket?.code,
          message: "Вы уже зарегистрированы на это событие. Ваш билет действителен.",
        };
      }

      if (existing.status === "WAITLIST") {
        // Calculate waitlist position
        const [posRes] = await db
          .select({ count: count() })
          .from(registrations)
          .where(
            and(
              eq(registrations.eventId, eventId),
              eq(registrations.status, "WAITLIST"),
              sql`${registrations.createdAt} <= ${existing.createdAt}`
            )
          );

        return {
          status: "WAITLIST" as const,
          alreadyRegistered: true,
          registration: existing,
          waitlistPosition: posRes?.count || 1,
          message: `Вы уже находитесь в листе ожидания (позиция №${posRes?.count || 1}).`,
        };
      }

      // If status was CANCELLED, we will re-activate inside the transaction below
    }

    const now = Date.now();

    // Concurrency-safe atomic transaction
    // Bun's SQLite transactions are serialized (BEGIN IMMEDIATE / EXCLUSIVE)
    const result = db.transaction((tx) => {
      // Re-read confirmed count inside transaction lock
      const [confirmedRes] = tx
        .select({ count: count() })
        .from(registrations)
        .where(and(eq(registrations.eventId, eventId), eq(registrations.status, "CONFIRMED")))
        .all();

      const confirmedCount = confirmedRes?.count || 0;

      if (confirmedCount < event.capacity) {
        // There is a free seat!
        let regId: number;

        if (existing && existing.status === "CANCELLED") {
          tx.update(registrations)
            .set({ status: "CONFIRMED", updatedAt: now })
            .where(eq(registrations.id, existing.id))
            .run();
          regId = existing.id;
        } else {
          const [newReg] = tx
            .insert(registrations)
            .values({
              eventId,
              email,
              status: "CONFIRMED",
              createdAt: now,
              updatedAt: now,
            })
            .returning()
            .all();
          regId = newReg.id;
        }

        const ticketCode = generateTicketCode();
        const [newTicket] = tx
          .insert(tickets)
          .values({
            registrationId: regId,
            eventId,
            code: ticketCode,
            status: "ISSUED",
            createdAt: now,
          })
          .returning()
          .all();

        return {
          type: "CONFIRMED" as const,
          registrationId: regId,
          ticketCode: newTicket.code,
        };
      } else {
        // Capacity reached: add to waitlist
        let regId: number;

        if (existing && existing.status === "CANCELLED") {
          tx.update(registrations)
            .set({ status: "WAITLIST", createdAt: now, updatedAt: now })
            .where(eq(registrations.id, existing.id))
            .run();
          regId = existing.id;
        } else {
          const [newReg] = tx
            .insert(registrations)
            .values({
              eventId,
              email,
              status: "WAITLIST",
              createdAt: now,
              updatedAt: now,
            })
            .returning()
            .all();
          regId = newReg.id;
        }

        const [waitlistPosRes] = tx
          .select({ count: count() })
          .from(registrations)
          .where(and(eq(registrations.eventId, eventId), eq(registrations.status, "WAITLIST")))
          .all();

        return {
          type: "WAITLIST" as const,
          registrationId: regId,
          waitlistPosition: waitlistPosRes?.count || 1,
        };
      }
    });

    // Send corresponding email & broadcast live stats
    if (result.type === "CONFIRMED") {
      await MailService.sendMail({
        eventId,
        recipient: email,
        type: "TICKET",
        eventTitle: event.title,
        eventDateFormatted: formattedDate,
        ticketCode: result.ticketCode,
      });

      const stats = await EventService.getEventStats(eventId);
      broadcastEventStats(eventId, { type: "REGISTRATION_CONFIRMED", stats });

      return {
        status: "CONFIRMED" as const,
        alreadyRegistered: false,
        ticketCode: result.ticketCode,
        message: "Место успешно забронировано! Билет отправлен на вашу почту.",
      };
    } else {
      await MailService.sendMail({
        eventId,
        recipient: email,
        type: "WAITLIST_JOIN",
        eventTitle: event.title,
        eventDateFormatted: formattedDate,
        waitlistPosition: result.waitlistPosition,
      });

      const stats = await EventService.getEventStats(eventId);
      broadcastEventStats(eventId, { type: "WAITLIST_JOINED", stats });

      return {
        status: "WAITLIST" as const,
        alreadyRegistered: false,
        waitlistPosition: result.waitlistPosition,
        message: `Все места заняты. Вы добавлены в лист ожидания под номером ${result.waitlistPosition}.`,
      };
    }
  }

  static async cancel(registrationId: number) {
    const [reg] = await db
      .select()
      .from(registrations)
      .where(eq(registrations.id, registrationId));

    if (!reg) throw new Error("Registration not found");
    if (reg.status === "CANCELLED") {
      return { success: false, message: "Регистрация уже была отменена." };
    }

    const event = await EventService.getEvent(reg.eventId);
    if (!event) throw new Error("Event not found");

    const wasConfirmed = reg.status === "CONFIRMED";
    const now = Date.now();

    let promotedCandidate: { email: string; ticketCode: string } | null = null;

    // Concurrency-safe cancellation and waitlist promotion
    db.transaction((tx) => {
      // 1. Mark registration as CANCELLED
      tx.update(registrations)
        .set({ status: "CANCELLED", updatedAt: now })
        .where(eq(registrations.id, registrationId))
        .run();

      // 2. Revoke active ticket if confirmed
      if (wasConfirmed) {
        tx.update(tickets)
          .set({ status: "REVOKED" })
          .where(eq(tickets.registrationId, registrationId))
          .run();

        // 3. Find first in waitlist (FIFO by createdAt)
        const [nextInLine] = tx
          .select()
          .from(registrations)
          .where(and(eq(registrations.eventId, reg.eventId), eq(registrations.status, "WAITLIST")))
          .orderBy(asc(registrations.createdAt))
          .limit(1)
          .all();

        if (nextInLine) {
          // Promote waitlisted attendee to CONFIRMED
          tx.update(registrations)
            .set({ status: "CONFIRMED", updatedAt: now })
            .where(eq(registrations.id, nextInLine.id))
            .run();

          const ticketCode = generateTicketCode();
          tx.insert(tickets)
            .values({
              registrationId: nextInLine.id,
              eventId: reg.eventId,
              code: ticketCode,
              status: "ISSUED",
              createdAt: now,
            })
            .run();

          promotedCandidate = {
            email: nextInLine.email,
            ticketCode,
          };
        }
      }
    });

    // If someone was promoted from waitlist, send them ticket email
    if (promotedCandidate) {
      const formattedDate = new Date(event.dateTime).toLocaleString("ru-RU", {
        timeZone: "UTC",
        dateStyle: "full",
        timeStyle: "short",
      });

      await MailService.sendMail({
        eventId: reg.eventId,
        recipient: (promotedCandidate as any).email,
        type: "WAITLIST_PROMOTED",
        eventTitle: event.title,
        eventDateFormatted: formattedDate,
        ticketCode: (promotedCandidate as any).ticketCode,
      });
    }

    const stats = await EventService.getEventStats(reg.eventId);
    broadcastEventStats(reg.eventId, {
      type: "REGISTRATION_CANCELLED",
      promotedEmail: (promotedCandidate as any)?.email,
      stats,
    });

    return {
      success: true,
      message: "Регистрация успешно отменена.",
      promotedEmail: (promotedCandidate as any)?.email ?? null,
    };
  }

  static async cancelByTicketCode(ticketCode: string) {
    const [ticket] = await db
      .select()
      .from(tickets)
      .where(eq(tickets.code, ticketCode.toUpperCase().trim()));

    if (!ticket) throw new Error("Ticket not found");
    return this.cancel(ticket.registrationId);
  }
}
