<p align="center">
  <a href="https://github.com/romanovro-arch/maddevs">
    <img src="https://img.shields.io/badge/MadEvents-Event_Registration_Platform-6366f1?style=for-the-badge&logo=ticketmaster&logoColor=white" alt="MadEvents" />
  </a>
</p>

<h1 align="center">⚡ MadEvents</h1>

<p align="center">
  <b>High-throughput, race-condition-proof event registration and live entrance management system.</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Runtime-Bun%201.4-000000?style=flat-square&logo=bun&logoColor=white" alt="Bun" />
  <img src="https://img.shields.io/badge/Backend-Hono%20v4-E36002?style=flat-square&logo=hono&logoColor=white" alt="Hono" />
  <img src="https://img.shields.io/badge/ORM-Drizzle%20SQLite-C5F74F?style=flat-square&logo=sqlite&logoColor=black" alt="Drizzle" />
  <img src="https://img.shields.io/badge/Frontend-Next.js%2016-000000?style=flat-square&logo=next.js&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/UI-shadcn%2Fui%20(Tailwind%20v4)-000000?style=flat-square&logo=shadcnui&logoColor=white" alt="shadcn" />
  <img src="https://img.shields.io/badge/Tests-Passing%20(6%2F6)-brightgreen?style=flat-square" alt="Tests" />
  <img src="https://img.shields.io/badge/License-MIT-blue?style=flat-square" alt="License" />
</p>

<br/>

## 🎯 Highlights

- ⚡ **Atomic Concurrency Guarantee**: Zero overbooking on the final ticket. Tested against 20 simultaneous registrations executed in the same millisecond.
- ⏳ **Automated FIFO Waitlist**: Instant promotion of next-in-line attendees when a reservation is cancelled, with immediate ticket generation.
- 🎟️ **Single-Use Check-In**: Hardened entrance verification with QR codes and tamper-proof single-use token invalidation.
- 📡 **Live WebSocket Sync**: Real-time counter streams check-in events straight to the organizer's command center without polling.
- ⏰ **Strict 24h Scheduler**: Background cron worker dispatching event reminders strictly once per attendee.
- 📢 **Reschedule Notifications**: Bulk updates triggered automatically whenever the organizer shifts dates.
- 📨 **In-App Dev Mailbox**: Embedded inspection drawer for reviewing simulated email notifications and one-click ticket previewing.

---

## 🏗️ Repository Architecture

```text
maddevs/
├── backend/                  # Fast API + WebSocket server
│   ├── src/
│   │   ├── db/               # Drizzle schemas (events, registrations, tickets, mail)
│   │   ├── services/         # Transactional booking, checkin, scheduler, mailer
│   │   ├── routes/           # REST endpoints (/events, /registrations, /tickets)
│   │   └── ws/               # WebSocket real-time live-stats broadcaster
│   └── tests/
│       └── concurrency.test.ts # High-load simultaneous race tests
│
└── frontend/                 # Turborepo Next.js monorepo
    ├── apps/web/             # Client application (App Router, React 19)
    │   ├── app/              # Routes: /, /events/[id], /checkin, /dashboard, /tickets
    │   ├── components/       # UI building blocks (TicketCard, DevMailbox, Dialogs)
    │   └── hooks/            # WebSocket synchronization hook
    └── packages/ui/          # Shared shadcn/ui components (Nova + Tailwind v4)
```

---

## ⚡ Quick Start

### Prerequisites
- [Bun](https://bun.sh) (`>= 1.4.0`)
- Node.js (`>= 20.9.0`)

### 1. Clone & Setup
```bash
git clone https://github.com/romanovro-arch/maddevs.git
cd maddevs
bun install
```

### 2. Start Both Projects (One Command)
```bash
bun run dev
```
> Runs both **Backend** (`http://localhost:3001`) and **Frontend** (`http://localhost:3000`) simultaneously via `concurrently`!

### 3. (Optional) Run Separately
```bash
# Backend only:
bun --cwd backend run dev

# Frontend only:
bun --cwd frontend run dev
```

---

## 🧪 Verification & Concurrency Tests

Run the high-concurrency race test suite verifying simultaneous seat claims:

```bash
cd backend
bun run test:concurrency
```

Output:
```text
✓ 1. RACE CONDITION TEST: 20 simultaneous registrations for 2 spots [957ms]
✓ 2. DUPLICATE EMAIL TEST: Duplicate registration with the same email does not create a second seat [1.6ms]
✓ 3. WAITLIST PROMOTION TEST: Cancellation auto-promotes first in waitlist (FIFO) [37ms]
✓ 4. SINGLE CHECK-IN TEST: Ticket can be checked in only once [17ms]
✓ 5. SCHEDULER TEST: Exactly ONE 24h reminder is sent [173ms]
✓ 6. RESCHEDULE TEST: All participants receive notification when event is rescheduled [392ms]
```

---

## 📄 Documentation Links

- [Backend Documentation](./backend/README.md)
- [Frontend Documentation](./frontend/README.md)

---

<p align="center">
  <sub>Built with ❤️ for MadDevs Engineering Challenge.</sub>
</p>
