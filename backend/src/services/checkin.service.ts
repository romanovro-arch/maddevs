import { db } from "../db";
import { tickets, registrations, events } from "../db/schema";
import { eq } from "drizzle-orm";
import { EventService } from "./event.service";
import { broadcastEventStats } from "../ws/live-stats";

export class CheckInService {
  static async checkIn(code: string) {
    const cleanCode = code.toUpperCase().trim();

    const [ticket] = await db
      .select({
        id: tickets.id,
        code: tickets.code,
        status: tickets.status,
        checkedInAt: tickets.checkedInAt,
        eventId: tickets.eventId,
        registrationId: tickets.registrationId,
        email: registrations.email,
        eventTitle: events.title,
      })
      .from(tickets)
      .innerJoin(registrations, eq(registrations.id, tickets.registrationId))
      .innerJoin(events, eq(events.id, tickets.eventId))
      .where(eq(tickets.code, cleanCode));

    if (!ticket) {
      return {
        success: false,
        code: "NOT_FOUND",
        message: "Билет с таким кодом не найден.",
      };
    }

    if (ticket.status === "REVOKED") {
      return {
        success: false,
        code: "REVOKED",
        message: "Этот билет аннулирован (участник отменил регистрацию).",
        ticket,
      };
    }

    if (ticket.status === "CHECKED_IN") {
      const formattedTime = ticket.checkedInAt
        ? new Date(ticket.checkedInAt).toLocaleTimeString("ru-RU", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })
        : "ранее";

      return {
        success: false,
        code: "ALREADY_CHECKED_IN",
        message: `Билет уже был использован в ${formattedTime}! Повторный вход запрещён.`,
        ticket,
      };
    }

    // Atomic update status to CHECKED_IN
    const now = Date.now();
    db.update(tickets)
      .set({
        status: "CHECKED_IN",
        checkedInAt: now,
      })
      .where(eq(tickets.id, ticket.id))
      .run();

    // Fetch updated live stats and broadcast
    const stats = await EventService.getEventStats(ticket.eventId);
    broadcastEventStats(ticket.eventId, {
      type: "CHECKIN_SUCCESS",
      lastCheckIn: {
        ticketCode: ticket.code,
        email: ticket.email,
        checkedInAt: now,
      },
      stats,
    });

    return {
      success: true,
      code: "SUCCESS",
      message: `Добро пожаловать! Билет успешно зарегистрирован.`,
      ticket: {
        ...ticket,
        status: "CHECKED_IN",
        checkedInAt: now,
      },
    };
  }

  static async getTicketDetails(code: string) {
    const cleanCode = code.toUpperCase().trim();

    const [ticket] = await db
      .select({
        id: tickets.id,
        code: tickets.code,
        status: tickets.status,
        checkedInAt: tickets.checkedInAt,
        eventId: tickets.eventId,
        registrationId: tickets.registrationId,
        email: registrations.email,
        registrationStatus: registrations.status,
        eventTitle: events.title,
        eventDateTime: events.dateTime,
        eventDescription: events.description,
      })
      .from(tickets)
      .innerJoin(registrations, eq(registrations.id, tickets.registrationId))
      .innerJoin(events, eq(events.id, tickets.eventId))
      .where(eq(tickets.code, cleanCode));

    return ticket || null;
  }
}
