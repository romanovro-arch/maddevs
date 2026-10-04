import { db } from "../db";
import { mailLogs, events } from "../db/schema";
import { eq, desc } from "drizzle-orm";

export type MailType =
  | "TICKET"
  | "WAITLIST_JOIN"
  | "WAITLIST_PROMOTED"
  | "REMINDER_24H"
  | "RESCHEDULED";

export interface SendMailParams {
  eventId: number;
  recipient: string;
  type: MailType;
  eventTitle: string;
  eventDateFormatted: string;
  ticketCode?: string;
  waitlistPosition?: number;
  newDateFormatted?: string;
  cancelToken?: string;
}

export class MailService {
  static async sendMail(params: SendMailParams) {
    const { subject, body } = this.renderTemplate(params);

    const [mail] = await db
      .insert(mailLogs)
      .values({
        eventId: params.eventId,
        recipient: params.recipient.toLowerCase().trim(),
        subject,
        body,
        type: params.type,
        createdAt: Date.now(),
      })
      .returning();

    console.log(`[📧 EMAIL SENT] To: ${params.recipient} | Subject: "${subject}" | Type: ${params.type}`);
    return mail;
  }

  static renderTemplate(params: SendMailParams): { subject: string; body: string } {
    switch (params.type) {
      case "TICKET":
        return {
          subject: `🎟️ Ваш билет на "${params.eventTitle}"`,
          body: `
Здравствуйте!
Вы успешно зарегистрированы на мероприятие "${params.eventTitle}".

📅 Дата и время: ${params.eventDateFormatted}
🎟️ Ваш код билета: ${params.ticketCode}

Покажите этот код или QR-код на входе при регистрации.
Если ваши планы изменятся, вы можете отказаться от участия в личном кабинете билета.
          `.trim(),
        };

      case "WAITLIST_JOIN":
        return {
          subject: `⏳ Вы в листе ожидания: "${params.eventTitle}"`,
          body: `
Здравствуйте!
Все места на мероприятие "${params.eventTitle}" закончились, но вы добавлены в лист ожидания.

📅 Дата мероприятия: ${params.eventDateFormatted}
Ваша позиция в очереди: №${params.waitlistPosition || 1}

Как только кто-то из участников откажется от места, вы автоматически получите билет и уведомление на эту почту!
          `.trim(),
        };

      case "WAITLIST_PROMOTED":
        return {
          subject: `🎉 Отличные новости! Вам досталось место на "${params.eventTitle}"`,
          body: `
Здравствуйте!
Один из участников отказался от посещения, и ваше место в листе ожидания освободилось!

📅 Дата и время: ${params.eventDateFormatted}
🎟️ Ваш код билета: ${params.ticketCode}

Покажите этот код на входе. Ждем вас!
          `.trim(),
        };

      case "REMINDER_24H":
        return {
          subject: `⏰ Напоминание: завтра состоится "${params.eventTitle}"`,
          body: `
Здравствуйте!
Напоминаем, что ровно через 24 часа состоится мероприятие "${params.eventTitle}".

📅 Дата и время: ${params.eventDateFormatted}
Не забудьте подготовить ваш билет с кодом для входа. До встречи!
          `.trim(),
        };

      case "RESCHEDULED":
        return {
          subject: `📢 Внимание: перенос даты мероприятия "${params.eventTitle}"`,
          body: `
Здравствуйте!
Организатор изменил дату проведения мероприятия "${params.eventTitle}".

🗓️ Новая дата и время: ${params.newDateFormatted}
Все зарегистрированные билеты и места в листе ожидания сохраняются действительными.
          `.trim(),
        };
    }
  }

  static async getLogs(limit = 50, eventId?: number) {
    if (eventId) {
      return db
        .select()
        .from(mailLogs)
        .where(eq(mailLogs.eventId, eventId))
        .orderBy(desc(mailLogs.createdAt))
        .limit(limit);
    }
    return db
      .select()
      .from(mailLogs)
      .orderBy(desc(mailLogs.createdAt))
      .limit(limit);
  }
}
