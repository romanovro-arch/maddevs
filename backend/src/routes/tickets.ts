import { Hono } from "hono";
import { CheckInService } from "../services/checkin.service";

export const ticketsRouter = new Hono();

// Get ticket details
ticketsRouter.get("/:code", async (c) => {
  const code = c.req.param("code");
  const ticket = await CheckInService.getTicketDetails(code);

  if (!ticket) {
    return c.json({ success: false, error: "Билет не найден" }, 404);
  }

  return c.json({ success: true, ticket });
});

// Check in ticket at the venue
ticketsRouter.post("/checkin", async (c) => {
  try {
    const body = await c.req.json();
    const { code } = body;

    if (!code) {
      return c.json({ success: false, error: "Код билета обязателен" }, 400);
    }

    const result = await CheckInService.checkIn(code);
    const status = result.success ? 200 : result.code === "NOT_FOUND" ? 404 : 409;

    return c.json(result, status);
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});
