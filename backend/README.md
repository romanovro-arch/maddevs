<p align="center">
  <img src="https://img.shields.io/badge/Bun-1.4-000000?style=for-the-badge&logo=bun&logoColor=white" alt="Bun" />
  <img src="https://img.shields.io/badge/Hono-v4-E36002?style=for-the-badge&logo=hono&logoColor=white" alt="Hono" />
  <img src="https://img.shields.io/badge/SQLite-WAL-003B57?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite" />
</p>

<h1 align="center">⚙️ MadEvents — Backend Core</h1>

<p align="center">
  <b>Ultrafast TypeScript backend engine built on Bun, Hono, SQLite WAL, and Drizzle ORM.</b>
</p>

---

## 🚀 Features

- 🏎️ **Native Bun Speed**: Direct `bun:sqlite` C-bindings with zero network overhead.
- 🔒 **ACID-Compliant Race Prevention**: Uses `BEGIN IMMEDIATE` / `db.transaction` serialized isolation to protect seat availability.
- 📡 **Native WebSockets**: Built-in `createBunWebSocket` adapter for broadcasting real-time check-in counts.
- ⏳ **FIFO Waitlist Queue**: Deterministic automatic seat allocation when confirmed tickets are cancelled.
- ⏰ **Idempotent 24h Scheduler**: Background job firing reminder emails strictly once.

---

## 📦 Project Structure

```text
backend/
├── src/
│   ├── db/
│   │   ├── schema.ts          # Drizzle tables (events, registrations, tickets, mailLogs)
│   │   ├── index.ts           # SQLite connection with PRAGMA journal_mode = WAL
│   │   └── seed.ts            # Demo event generation script
│   ├── services/
│   │   ├── event.service.ts   # Event management & attendee stats
│   │   ├── registration.ts    # Concurrency-safe booking & FIFO waitlist promotions
│   │   ├── checkin.service.ts # Single-use ticket redemption
│   │   ├── mail.service.ts    # Outbox logging & notification generator
│   │   └── scheduler.ts       # 24-hour reminder runner
│   ├── routes/
│   │   ├── events.ts          # GET/POST/PATCH /api/events
│   │   ├── registrations.ts   # POST /api/registrations, POST /cancel
│   │   ├── tickets.ts         # GET /api/tickets/:code, POST /checkin
│   │   └── dev-mail.ts        # GET /api/dev-mail, POST /trigger-reminders
│   ├── ws/
│   │   └── live-stats.ts      # WebSocket rooms & subscriber registry
│   └── index.ts               # Server bootstrap & middleware
└── tests/
    └── concurrency.test.ts    # 20 simultaneous seat claims test
```

---

## 🛠️ CLI Commands

| Command | Description |
| :--- | :--- |
| `bun run dev` | Starts server in watch mode on port `3001` |
| `bun run start` | Starts production server |
| `bun run db:push` | Pushes Drizzle schema migrations to SQLite |
| `bun run seed` | Seeds database with a demo conference and attendees |
| `bun test` | Runs the full verification & race test suite |

---

## 📡 REST & WebSocket API Reference

### Events
- `GET /api/events` — Retrieve all events with live capacity stats.
- `POST /api/events` — Create an event (`title`, `description`, `dateTime`, `capacity`).
- `GET /api/events/:id` — Event details and attendance statistics.
- `PATCH /api/events/:id` — Update event details or shift date (notifies all participants).
- `GET /api/events/:id/participants` — List confirmed attendees and waitlist queue.

### Registrations
- `POST /api/registrations` — Register by `{ eventId, email }`. Returns `CONFIRMED` or `WAITLIST`.
- `POST /api/registrations/:id/cancel` — Cancel registration, auto-promoting next in waitlist.
- `POST /api/registrations/cancel-by-ticket` — Cancel participation using ticket code.

### Tickets & Check-In
- `GET /api/tickets/:code` — Look up ticket status and attendee details.
- `POST /api/tickets/checkin` — Check in ticket `{ code }`. Broadcasts live stats on success.

### WebSocket
- `ws://localhost:3001/ws?eventId=:id` — Live stream of check-ins and counter updates for event `:id`.

### Dev Mailbox
- `GET /api/dev-mail` — View recently logged emails.
- `POST /api/dev-mail/trigger-reminders` — Force immediate execution of 24h reminder check.
