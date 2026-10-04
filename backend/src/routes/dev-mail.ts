import { Hono } from "hono";
import { MailService } from "../services/mail.service";
import { SchedulerService } from "../services/scheduler.service";

export const devMailRouter = new Hono();

// Get recent mail logs
devMailRouter.get("/", async (c) => {
  const eventId = c.req.query("eventId") ? Number(c.req.query("eventId")) : undefined;
  const limit = c.req.query("limit") ? Number(c.req.query("limit")) : 50;

  const logs = await MailService.getLogs(limit, eventId);
  return c.json({ success: true, count: logs.length, mails: logs });
});

// Manually trigger 24h reminder check (useful for instant testing and verification)
devMailRouter.post("/trigger-reminders", async (c) => {
  try {
    const result = await SchedulerService.processReminders();
    return c.json({
      success: true,
      message: `Проверка напоминаний выполнена: обработано событий: ${result.processedEvents}, отправлено писем: ${result.sentEmails}`,
      result,
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});
