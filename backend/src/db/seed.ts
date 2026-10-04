import { EventService } from "../services/event.service";
import { RegistrationService } from "../services/registration.service";

async function seed() {
  console.log("🌱 Seeding initial demo event...");

  // Event in 2 days with 5 spots limit
  const event = await EventService.createEvent({
    title: "MadDevs Tech Conference 2026",
    description:
      "Главная конференция года по высоконагруженным системам, архитектуре и современным практикам разработки.",
    dateTime: Date.now() + 2 * 24 * 60 * 60 * 1000,
    capacity: 5,
  });

  console.log(`Created event ID: ${event.id}`);

  // Register 7 participants (5 will get spots, 2 will go to waitlist)
  const users = [
    "alexander.smirnov@example.com",
    "elena.vasilieva@example.com",
    "dmitry.kuznetsov@example.com",
    "olga.morozova@example.com",
    "sergey.popov@example.com",
    "anna.sokolova@example.com", // Waitlist #1
    "mikhail.fedorov@example.com", // Waitlist #2
  ];

  for (const email of users) {
    const res = await RegistrationService.register({
      eventId: event.id,
      email,
    });
    console.log(`Registered ${email}: ${res.status}`);
  }

  const stats = await EventService.getEventStats(event.id);
  console.log("Demo Event Stats:", stats);
  console.log("🌱 Seeding finished successfully!");
}

seed().catch(console.error);
