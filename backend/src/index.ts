import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { eventsRouter } from "./routes/events";
import { registrationsRouter } from "./routes/registrations";
import { ticketsRouter } from "./routes/tickets";
import { devMailRouter } from "./routes/dev-mail";
import {
  upgradeWebSocket,
  websocket,
  subscribeToEvent,
  unsubscribeFromEvent,
} from "./ws/live-stats";
import { EventService } from "./services/event.service";
import { SchedulerService } from "./services/scheduler.service";

const app = new Hono();

// Global Middlewares
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

// WebSocket endpoint for real-time live stats updates
app.get(
  "/ws",
  upgradeWebSocket((c) => {
    const eventIdParam = c.req.query("eventId");
    const eventId = eventIdParam ? Number(eventIdParam) : null;

    return {
      async onOpen(evt, ws) {
        if (eventId) {
          subscribeToEvent(eventId, ws);
          console.log(`[WS] Client subscribed to event ${eventId}`);
          // Send initial stats immediately
          const stats = await EventService.getEventStats(eventId);
          ws.send(JSON.stringify({ type: "INITIAL_STATS", stats }));
        }
      },
      onClose(evt, ws) {
        if (eventId) {
          unsubscribeFromEvent(eventId, ws);
          console.log(`[WS] Client unsubscribed from event ${eventId}`);
        }
      },
      onMessage(evt, ws) {
        // Can handle incoming ping or custom messages
        try {
          const msg = JSON.parse(String(evt.data));
          if (msg.type === "PING") {
            ws.send(JSON.stringify({ type: "PONG" }));
          }
        } catch {}
      },
    };
  })
);

// Health check
app.get("/health", (c) => c.json({ status: "ok", time: Date.now() }));

// Mount API routes
app.route("/api/events", eventsRouter);
app.route("/api/registrations", registrationsRouter);
app.route("/api/tickets", ticketsRouter);
app.route("/api/dev-mail", devMailRouter);

// Start 24h reminder scheduler
SchedulerService.start(30000);

const PORT = Number(process.env.PORT) || 3001;

console.log(`🚀 MadDevs Event Service backend running on http://localhost:${PORT}`);
console.log(`📡 WebSocket endpoint available at ws://localhost:${PORT}/ws?eventId=<id>`);

export default {
  port: PORT,
  fetch: app.fetch,
  websocket,
};
