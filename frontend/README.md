<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16%20(App%20Router)-000000?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/shadcn%2Fui-Nova-000000?style=for-the-badge&logo=shadcnui&logoColor=white" alt="shadcn" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind" />
</p>

<h1 align="center">🎨 MadEvents — Frontend UI</h1>

<p align="center">
  <b>Modern Next.js application powered by Turborepo, shadcn/ui design tokens, and real-time WebSockets.</b>
</p>

---

## 🖥️ Screen Architecture

```text
frontend/apps/web/app/
├── page.tsx                     # Event discovery showcase & creation dialog
├── layout.tsx                   # Theme provider, navigation bar & Dev Mailbox
├── events/
│   └── [id]/
│       ├── page.tsx             # Public registration & waitlist enrollment
│       ├── dashboard/page.tsx   # Live organizer command center (WebSocket counter)
│       └── checkin/page.tsx     # High-contrast scanner & check-in terminal
└── tickets/
    └── [code]/page.tsx          # Ticket card with QR code and cancellation trigger
```

---

## 🧩 Design System (`@workspace/ui`)

Components are partitioned into a shared Turborepo package built on `@base-ui/react` and Tailwind CSS v4:

- 🎴 **Card & Dialog**: Modular container surfaces for forms, stats, and confirmations.
- 🏷️ **Badge**: Reactive indicator for seat availability and ticket states (`ISSUED`, `CHECKED_IN`, `REVOKED`).
- 📊 **Table & Tabs**: Split views for confirmed attendees and waitlist queue management.
- 📱 **QR Code**: Instant browser-side vector rendering via `qrcode.react`.
- 📬 **Dev Mailbox Drawer**: Floating UI tool for previewing tickets without third-party email clients.

---

## 🛠️ CLI Commands

Run commands from `frontend/`:

| Command | Description |
| :--- | :--- |
| `bun run dev` | Starts Turborepo dev server at `http://localhost:3000` |
| `bun run build` | Compiles production Next.js bundle |
| `bun run typecheck` | Validates TypeScript across all workspace packages |
| `bun run lint` | Runs ESLint |

---

## ⚙️ Environment Variables

Create `.env.local` inside `frontend/apps/web/`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
```
