import { describe, it, expect, beforeAll } from "bun:test";
import { db } from "../src/db";
import { events, registrations, tickets, mailLogs } from "../src/db/schema";
import { EventService } from "../src/services/event.service";
import { RegistrationService } from "../src/services/registration.service";
import { CheckInService } from "../src/services/checkin.service";
import { SchedulerService } from "../src/services/scheduler.service";
import { eq, and, sql } from "drizzle-orm";

describe("Event Registration Service - Complete Verification Suite", () => {
  let testEventId: number;

  beforeAll(async () => {
    // Clean up test data if needed
    // Create an event with capacity = 2
    const event = await EventService.createEvent({
      title: "MadDevs Highload Summit",
      description: "Тестирование конкурентности и листа ожидания",
      dateTime: Date.now() + 48 * 60 * 60 * 1000, // in 48 hours
      capacity: 2,
    });
    testEventId = event.id;
  });

  it("1. RACE CONDITION TEST: 20 simultaneous registrations for 2 spots", async () => {
    // Generate 20 distinct registration requests executed at the exact same instant
    const promises = Array.from({ length: 20 }).map((_, i) =>
      RegistrationService.register({
        eventId: testEventId,
        email: `contestant_${i}@example.com`,
      })
    );

    const results = await Promise.all(promises);

    const confirmed = results.filter((r) => r.status === "CONFIRMED");
    const waitlisted = results.filter((r) => r.status === "WAITLIST");

    // Exactly 2 must get the spots!
    expect(confirmed.length).toBe(2);
    // Exactly 18 must end up in the waitlist!
    expect(waitlisted.length).toBe(18);

    // Verify database counts
    const stats = await EventService.getEventStats(testEventId);
    expect(stats?.confirmedCount).toBe(2);
    expect(stats?.waitlistCount).toBe(18);
    expect(stats?.seatsLeft).toBe(0);
  });

  it("2. DUPLICATE EMAIL TEST: Duplicate registration with the same email does not create a second seat", async () => {
    // Try re-registering with an already confirmed email
    const reRegisterResult = await RegistrationService.register({
      eventId: testEventId,
      email: "contestant_0@example.com",
    });

    expect(reRegisterResult.alreadyRegistered).toBe(true);

    // Verify confirmed count didn't increase
    const stats = await EventService.getEventStats(testEventId);
    expect(stats?.confirmedCount).toBe(2);
  });

  it("3. WAITLIST PROMOTION TEST: Cancellation auto-promotes first in waitlist (FIFO)", async () => {
    // Find one of the confirmed registrations
    const confirmedRegs = await db
      .select()
      .from(registrations)
      .where(
        and(eq(registrations.eventId, testEventId), eq(registrations.status, "CONFIRMED"))
      );

    const cancelledUser = confirmedRegs[0];

    // Find who was first in the waitlist
    const [firstWaitlisted] = await db
      .select()
      .from(registrations)
      .where(
        and(eq(registrations.eventId, testEventId), eq(registrations.status, "WAITLIST"))
      )
      .orderBy(registrations.createdAt)
      .limit(1);

    expect(firstWaitlisted).toBeDefined();

    // Cancel registration
    const cancelResult = await RegistrationService.cancel(cancelledUser.id);
    expect(cancelResult.success).toBe(true);
    expect(cancelResult.promotedEmail).toBe(firstWaitlisted.email);

    // Verify first waitlisted is now CONFIRMED and has an ISSUED ticket
    const [promotedUser] = await db
      .select()
      .from(registrations)
      .where(eq(registrations.id, firstWaitlisted.id));

    expect(promotedUser.status).toBe("CONFIRMED");

    const [promotedTicket] = await db
      .select()
      .from(tickets)
      .where(eq(tickets.registrationId, firstWaitlisted.id));

    expect(promotedTicket).toBeDefined();
    expect(promotedTicket.status).toBe("ISSUED");

    // Stats should now be: 2 confirmed, 17 waitlisted
    const stats = await EventService.getEventStats(testEventId);
    expect(stats?.confirmedCount).toBe(2);
    expect(stats?.waitlistCount).toBe(17);
  });

  it("4. SINGLE CHECK-IN TEST: Ticket can be checked in only once", async () => {
    // Get an active ticket
    const [activeTicket] = await db
      .select()
      .from(tickets)
      .where(and(eq(tickets.eventId, testEventId), eq(tickets.status, "ISSUED")))
      .limit(1);

    expect(activeTicket).toBeDefined();

    // 1st Check-in -> Success
    const firstCheckIn = await CheckInService.checkIn(activeTicket.code);
    expect(firstCheckIn.success).toBe(true);
    expect(firstCheckIn.code).toBe("SUCCESS");

    // 2nd Check-in -> Fails (Already checked in)
    const secondCheckIn = await CheckInService.checkIn(activeTicket.code);
    expect(secondCheckIn.success).toBe(false);
    expect(secondCheckIn.code).toBe("ALREADY_CHECKED_IN");

    // Stats should reflect 1 checked in
    const stats = await EventService.getEventStats(testEventId);
    expect(stats?.checkedInCount).toBe(1);
  });

  it("5. SCHEDULER TEST: Exactly ONE 24h reminder is sent", async () => {
    // Create an event that starts in 18 hours (within 24h window)
    const urgentEvent = await EventService.createEvent({
      title: "Urgent Workshop",
      description: "Тест напоминания за сутки",
      dateTime: Date.now() + 18 * 60 * 60 * 1000,
      capacity: 5,
    });

    // Register 2 participants
    await RegistrationService.register({
      eventId: urgentEvent.id,
      email: "urgent_attendee_1@test.com",
    });
    await RegistrationService.register({
      eventId: urgentEvent.id,
      email: "urgent_attendee_2@test.com",
    });

    // First scheduler run: should send 2 reminder emails
    const firstRun = await SchedulerService.processReminders();
    expect(firstRun.processedEvents).toBeGreaterThanOrEqual(1);

    // Second scheduler run immediately: should send 0 reminder emails for this event!
    const secondRun = await SchedulerService.processReminders();
    expect(secondRun.sentEmails).toBe(0);

    // Check in database that reminder24hSent is true
    const updated = await EventService.getEvent(urgentEvent.id);
    expect(updated?.reminder24hSent).toBe(true);
  });

  it("6. RESCHEDULE TEST: All participants receive notification when event is rescheduled", async () => {
    const newDateTime = Date.now() + 7 * 24 * 60 * 60 * 1000; // in 7 days
    await EventService.updateEvent(testEventId, {
      dateTime: newDateTime,
    });

    // Check mail logs for RESCHEDULED
    const logs = await db
      .select()
      .from(mailLogs)
      .where(and(eq(mailLogs.eventId, testEventId), eq(mailLogs.type, "RESCHEDULED")));

    // We have 2 confirmed + 17 waitlisted = 19 active participants
    expect(logs.length).toBe(19);
  });
});
