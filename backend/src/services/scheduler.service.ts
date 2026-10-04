import { db } from "../db";
import { events, registrations } from "../db/schema";
import { eq, and, sql, lte, gt } from "drizzle-orm";
import { MailService } from "./mail.service";

export class SchedulerService {
  private static timer: any = null;

  static start(intervalMs = 30000) {
    if (this.timer) return;
    console.log(`[⏰ SCHEDULER] Started checking 24h reminders every ${intervalMs / 1000}s`);

    // Run immediately once, then on interval
    this.processReminders();
    this.timer = setInterval(() => this.processReminders(), intervalMs);
  }

  static stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  static async processReminders(): Promise<{ processedEvents: number; sentEmails: number }> {
    const now = Date.now();
    const targetThreshold = now + 24 * 60 * 60 * 1000; // within next 24 hours

    // Find events happening within the next 24 hours where reminder hasn't been sent yet
    const pendingEvents = await db
      .select()
      .from(events)
      .where(
        and(
          eq(events.reminder24hSent, false),
          lte(events.dateTime, targetThreshold),
          gt(events.dateTime, now)
        )
      );

    let sentEmails = 0;

    for (const event of pendingEvents) {
      // Atomic check and flag to guarantee strictly ONCE execution
      let shouldSend = false;
      db.transaction((tx) => {
        const [current] = tx
          .select({ reminder24hSent: events.reminder24hSent })
          .from(events)
          .where(eq(events.id, event.id))
          .all();

        if (current && !current.reminder24hSent) {
          tx.update(events)
            .set({ reminder24hSent: true, updatedAt: now })
            .where(eq(events.id, event.id))
            .run();
          shouldSend = true;
        }
      });

      if (!shouldSend) continue;

      // Fetch all confirmed attendees
      const attendees = await db
        .select()
        .from(registrations)
        .where(
          and(eq(registrations.eventId, event.id), eq(registrations.status, "CONFIRMED"))
        );

      const formattedDate = new Date(event.dateTime).toLocaleString("ru-RU", {
        timeZone: "UTC",
        dateStyle: "full",
        timeStyle: "short",
      });

      console.log(
        `[⏰ SCHEDULER] Sending 24h reminder for event "${event.title}" to ${attendees.length} attendees`
      );

      for (const attendee of attendees) {
        await MailService.sendMail({
          eventId: event.id,
          recipient: attendee.email,
          type: "REMINDER_24H",
          eventTitle: event.title,
          eventDateFormatted: formattedDate,
        });
        sentEmails++;
      }
    }

    return {
      processedEvents: pendingEvents.length,
      sentEmails,
    };
  }
}
