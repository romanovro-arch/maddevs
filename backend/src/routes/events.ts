import { Hono } from "hono";
import { EventService } from "../services/event.service";

export const eventsRouter = new Hono();

// List all events
eventsRouter.get("/", async (c) => {
  const list = await EventService.listEvents();
  return c.json({ success: true, events: list });
});

// Create new event
eventsRouter.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const { title, description, dateTime, capacity } = body;

    if (!title || !description || !dateTime || !capacity) {
      return c.json(
        { success: false, error: "Поля title, description, dateTime, capacity обязательны" },
        400
      );
    }

    const event = await EventService.createEvent({
      title,
      description,
      dateTime: Number(dateTime),
      capacity: Number(capacity),
    });

    return c.json({ success: true, event }, 201);
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// Get event by ID
eventsRouter.get("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const event = await EventService.getEvent(id);
  if (!event) return c.json({ success: false, error: "Событие не найдено" }, 404);

  const stats = await EventService.getEventStats(id);
  return c.json({ success: true, event, stats });
});

// Get event stats
eventsRouter.get("/:id/stats", async (c) => {
  const id = Number(c.req.param("id"));
  const stats = await EventService.getEventStats(id);
  if (!stats) return c.json({ success: false, error: "Событие не найдено" }, 404);

  return c.json({ success: true, stats });
});

// Get event participants
eventsRouter.get("/:id/participants", async (c) => {
  const id = Number(c.req.param("id"));
  const participants = await EventService.getEventParticipants(id);
  return c.json({ success: true, participants });
});

// Update event (e.g. reschedule)
eventsRouter.patch("/:id", async (c) => {
  try {
    const id = Number(c.req.param("id"));
    const body = await c.req.json();

    const updated = await EventService.updateEvent(id, {
      title: body.title,
      description: body.description,
      dateTime: body.dateTime ? Number(body.dateTime) : undefined,
      capacity: body.capacity ? Number(body.capacity) : undefined,
    });

    return c.json({ success: true, event: updated });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});
