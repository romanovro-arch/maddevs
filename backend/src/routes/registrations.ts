import { Hono } from "hono";
import { RegistrationService } from "../services/registration.service";

export const registrationsRouter = new Hono();

// Register participant (handles capacity, race condition, waitlist, email duplication)
registrationsRouter.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const { eventId, email } = body;

    if (!eventId || !email) {
      return c.json({ success: false, error: "Поля eventId и email обязательны" }, 400);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return c.json({ success: false, error: "Некорректный email адрес" }, 400);
    }

    const result = await RegistrationService.register({
      eventId: Number(eventId),
      email,
    });

    return c.json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});

// Cancel registration by ID (triggers automatic FIFO waitlist promotion)
registrationsRouter.post("/:id/cancel", async (c) => {
  try {
    const id = Number(c.req.param("id"));
    const result = await RegistrationService.cancel(id);
    return c.json(result);
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});

// Cancel registration by Ticket Code
registrationsRouter.post("/cancel-by-ticket", async (c) => {
  try {
    const body = await c.req.json();
    const { code } = body;
    if (!code) {
      return c.json({ success: false, error: "Код билета обязателен" }, 400);
    }

    const result = await RegistrationService.cancelByTicketCode(code);
    return c.json(result);
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});
