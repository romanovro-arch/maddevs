"use client";

import { useEffect, useState } from "react";
import { api, MailLog } from "@/lib/api";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@workspace/ui/components/dialog";
import { Mail, RefreshCw, Clock, ExternalLink, Sparkles, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export function DevMailboxDrawer() {
  const [open, setOpen] = useState(false);
  const [mails, setMails] = useState<MailLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadMails = async () => {
    setLoading(true);
    try {
      const logs = await api.getMailLogs();
      setMails(logs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadMails();
    }
  }, [open]);

  const handleTriggerReminders = async () => {
    setTriggering(true);
    setFeedback(null);
    try {
      const res = await api.trigger24hReminders();
      setFeedback(res.message);
      await loadMails();
      setTimeout(() => setFeedback(null), 5000);
    } catch (err: any) {
      setFeedback("Ошибка запуска: " + err.message);
    } finally {
      setTriggering(false);
    }
  };

  const getBadgeColor = (type: MailLog["type"]) => {
    switch (type) {
      case "TICKET":
        return "default";
      case "WAITLIST_JOIN":
        return "secondary";
      case "WAITLIST_PROMOTED":
        return "outline";
      case "REMINDER_24H":
        return "secondary";
      case "RESCHEDULED":
        return "destructive";
      default:
        return "default";
    }
  };

  const extractTicketCode = (body: string) => {
    const match = body.match(/MAD-[A-Z0-9]{6}/);
    return match ? match[0] : null;
  };

  return (
    <>
      {/* Floating trigger button in bottom right */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setOpen(true)}
          className="shadow-xl rounded-full px-4 py-2.5 flex items-center gap-2 font-medium bg-foreground text-background hover:bg-foreground/90 transition-all hover:scale-105"
        >
          <Mail className="h-4 w-4" />
          <span>Dev Mailbox</span>
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        </Button>
      </div>

      {/* Dialog showing all sent mails */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6">
          <DialogHeader className="border-b pb-4">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  Виртуальный почтовый ящик (Dev Outbox)
                </DialogTitle>
                <DialogDescription className="mt-1 text-xs">
                  Все отправленные сервисом письма (билеты, продвижение из очереди, напоминания).
                </DialogDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={loadMails}
                disabled={loading}
                className="gap-1.5 h-8 text-xs"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                Обновить
              </Button>
            </div>

            {/* 24h Reminder simulation button */}
            <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary shrink-0" />
                <span>
                  <strong>Тест планировщика:</strong> проверить и отправить напоминания за 24 часа
                </span>
              </div>
              <Button
                size="sm"
                variant="default"
                onClick={handleTriggerReminders}
                disabled={triggering}
                className="h-7 text-xs gap-1.5 shrink-0"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {triggering ? "Проверка..." : "Запустить проверку"}
              </Button>
            </div>

            {feedback && (
              <div className="mt-2 text-xs flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {feedback}
              </div>
            )}
          </DialogHeader>

          {/* Mail Items Scroll Area */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-2">
            {mails.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm">
                Писем пока нет. Зарегистрируйтесь на мероприятие, чтобы увидеть отправленный билет!
              </div>
            ) : (
              mails.map((mail) => {
                const ticketCode = extractTicketCode(mail.body);
                return (
                  <div
                    key={mail.id}
                    className="rounded-lg border bg-card/60 p-3.5 text-xs transition-colors hover:bg-accent/40"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={getBadgeColor(mail.type)} className="text-[10px] px-1.5 py-0">
                          {mail.type}
                        </Badge>
                        <span className="font-semibold text-foreground">{mail.recipient}</span>
                      </div>
                      <span className="text-[11px] text-muted-foreground shrink-0">
                        {new Date(mail.createdAt).toLocaleTimeString("ru-RU", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </span>
                    </div>

                    <div className="font-medium text-foreground mb-1 text-sm">{mail.subject}</div>
                    <pre className="whitespace-pre-wrap font-sans text-muted-foreground text-xs leading-relaxed bg-muted/30 p-2.5 rounded border border-border/40">
                      {mail.body}
                    </pre>

                    {ticketCode && (
                      <div className="mt-2 pt-2 border-t border-dashed flex items-center justify-between">
                        <span className="text-muted-foreground">Билет: <strong>{ticketCode}</strong></span>
                        <Link
                          href={`/tickets/${ticketCode}`}
                          onClick={() => setOpen(false)}
                          className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
                        >
                          <span>Открыть билет</span>
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
