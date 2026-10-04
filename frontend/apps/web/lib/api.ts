const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001";

export interface EventStats {
  eventId: number;
  capacity: number;
  confirmedCount: number;
  waitlistCount: number;
  checkedInCount: number;
  seatsLeft: number;
}

export interface EventItem {
  id: number;
  title: string;
  description: string;
  dateTime: number;
  capacity: number;
  reminder24hSent: boolean;
  createdAt: number;
  updatedAt: number;
  stats?: EventStats;
}

export interface Participant {
  id: number;
  email: string;
  status: "CONFIRMED" | "WAITLIST" | "CANCELLED";
  createdAt: number;
  ticketCode?: string;
  ticketStatus?: "ISSUED" | "CHECKED_IN" | "REVOKED";
  checkedInAt?: number | null;
}

export interface TicketDetails {
  id: number;
  code: string;
  status: "ISSUED" | "CHECKED_IN" | "REVOKED";
  checkedInAt: number | null;
  eventId: number;
  registrationId: number;
  email: string;
  registrationStatus: string;
  eventTitle: string;
  eventDateTime: number;
  eventDescription: string;
}

export interface MailLog {
  id: number;
  eventId: number | null;
  recipient: string;
  subject: string;
  body: string;
  type: "TICKET" | "WAITLIST_JOIN" | "WAITLIST_PROMOTED" | "REMINDER_24H" | "RESCHEDULED";
  createdAt: number;
}

export const api = {
  async getEvents(): Promise<EventItem[]> {
    const res = await fetch(`${API_URL}/api/events`, { cache: "no-store" });
    const data = await res.json();
    return data.events || [];
  },

  async getEvent(id: number): Promise<{ event: EventItem; stats: EventStats }> {
    const res = await fetch(`${API_URL}/api/events/${id}`, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Ошибка загрузки события");
    return { event: data.event, stats: data.stats };
  },

  async createEvent(input: {
    title: string;
    description: string;
    dateTime: number;
    capacity: number;
  }): Promise<EventItem> {
    const res = await fetch(`${API_URL}/api/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Ошибка создания события");
    return data.event;
  },

  async updateEvent(
    id: number,
    input: {
      title?: string;
      description?: string;
      dateTime?: number;
      capacity?: number;
    }
  ): Promise<EventItem> {
    const res = await fetch(`${API_URL}/api/events/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Ошибка обновления события");
    return data.event;
  },

  async getParticipants(eventId: number): Promise<Participant[]> {
    const res = await fetch(`${API_URL}/api/events/${eventId}/participants`, {
      cache: "no-store",
    });
    const data = await res.json();
    return data.participants || [];
  },

  async register(
    eventId: number,
    email: string
  ): Promise<{
    status: "CONFIRMED" | "WAITLIST";
    alreadyRegistered: boolean;
    ticketCode?: string;
    waitlistPosition?: number;
    message: string;
  }> {
    const res = await fetch(`${API_URL}/api/registrations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, email }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Ошибка регистрации");
    return data;
  },

  async cancelRegistration(id: number): Promise<{ success: boolean; message: string; promotedEmail?: string }> {
    const res = await fetch(`${API_URL}/api/registrations/${id}/cancel`, {
      method: "POST",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Ошибка отмены");
    return data;
  },

  async cancelByTicket(code: string): Promise<{ success: boolean; message: string; promotedEmail?: string }> {
    const res = await fetch(`${API_URL}/api/registrations/cancel-by-ticket`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Ошибка отмены");
    return data;
  },

  async getTicket(code: string): Promise<TicketDetails> {
    const res = await fetch(`${API_URL}/api/tickets/${code}`, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Билет не найден");
    return data.ticket;
  },

  async checkIn(code: string): Promise<{
    success: boolean;
    code: string;
    message: string;
    ticket?: any;
  }> {
    const res = await fetch(`${API_URL}/api/tickets/checkin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = await res.json();
    return data;
  },

  async getMailLogs(eventId?: number): Promise<MailLog[]> {
    const url = eventId
      ? `${API_URL}/api/dev-mail?eventId=${eventId}`
      : `${API_URL}/api/dev-mail`;
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();
    return data.mails || [];
  },

  async trigger24hReminders(): Promise<{ message: string; result: any }> {
    const res = await fetch(`${API_URL}/api/dev-mail/trigger-reminders`, {
      method: "POST",
    });
    const data = await res.json();
    return data;
  },
};
