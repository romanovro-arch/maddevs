"use client";

import { use, useEffect, useState } from "react";
import { api, EventItem, EventStats } from "@/lib/api";
import { useEventLiveStats } from "@/hooks/useEventLiveStats";
import Link from "next/link";
import confetti from "canvas-confetti";
import { Button } from "@workspace/ui/components/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Input } from "@workspace/ui/components/input";
import {
  Calendar,
  Users,
  Ticket,
  CheckCircle2,
  Clock,
  ArrowLeft,
  LayoutDashboard,
  QrCode,
  Sparkles,
  ExternalLink,
  AlertCircle,
} from "lucide-react";

export default function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const eventId = Number(resolvedParams.id);

  const [event, setEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [regResult, setRegResult] = useState<{
    status: "CONFIRMED" | "WAITLIST";
    alreadyRegistered: boolean;
    ticketCode?: string;
    waitlistPosition?: number;
    message: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Real-time live stats hook
  const { stats: liveStats, setStats } = useEventLiveStats(eventId);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getEvent(eventId);
        setEvent(data.event);
        setStats(data.stats);
      } catch (err: any) {
        setError(err.message || "Ошибка загрузки");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [eventId, setStats]);

  const stats = liveStats || event?.stats;
  const seatsLeft = stats ? stats.seatsLeft : (event?.capacity || 0);
  const hasSeats = seatsLeft > 0;
  const confirmedCount = stats ? stats.confirmedCount : 0;
  const waitlistCount = stats ? stats.waitlistCount : 0;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setError(null);
    setSubmitting(true);

    try {
      const res = await api.register(eventId, email.trim());
      setRegResult(res);

      if (res.status === "CONFIRMED" && !res.alreadyRegistered) {
        // Trigger celebratory confetti
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      }
    } catch (err: any) {
      setError(err.message || "Не удалось завершить регистрацию");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center max-w-xl">
        <div className="h-64 rounded-xl border bg-muted/40 animate-pulse" />
      </div>
    );
  }

  if (!event || error) {
    return (
      <div className="container mx-auto px-4 py-16 text-center max-w-xl space-y-4">
        <div className="text-destructive font-semibold">{error || "Событие не найдено"}</div>
        <Link href="/">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" /> На главную
          </Button>
        </Link>
      </div>
    );
  }

  const formattedDate = new Date(event.dateTime).toLocaleString("ru-RU", {
    timeZone: "UTC",
    dateStyle: "full",
    timeStyle: "short",
  });

  return (
    <div className="container mx-auto px-4 sm:px-8 py-8 max-w-3xl space-y-8">
      {/* Back navigation & Quick links */}
      <div className="flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Все события
        </Link>

        <div className="flex items-center gap-2">
          <Link href={`/events/${eventId}/dashboard`}>
            <Button variant="outline" size="sm" className="text-xs h-8 gap-1.5">
              <LayoutDashboard className="h-3.5 w-3.5 text-primary" />
              <span>Дашборд</span>
            </Button>
          </Link>
          <Link href={`/events/${eventId}/checkin`}>
            <Button variant="outline" size="sm" className="text-xs h-8 gap-1.5">
              <QrCode className="h-3.5 w-3.5 text-primary" />
              <span>Вход на событие</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Event Card */}
      <Card className="border shadow-lg overflow-hidden bg-card">
        <CardHeader className="space-y-3 pb-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            {hasSeats ? (
              <Badge variant="default" className="text-xs bg-emerald-600 hover:bg-emerald-600 text-white gap-1 px-3 py-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Осталось свободных мест: {seatsLeft}
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 gap-1 px-3 py-1">
                <Clock className="h-3.5 w-3.5" />
                Мест нет. Доступен лист ожидания ({waitlistCount} в очереди)
              </Badge>
            )}

            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Users className="h-3.5 w-3.5" /> Лимит: {event.capacity} мест
            </span>
          </div>

          <CardTitle className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {event.title}
          </CardTitle>

          <CardDescription className="text-sm flex items-center gap-2 text-foreground/80 font-medium">
            <Calendar className="h-4 w-4 text-primary shrink-0" />
            <span>{formattedDate}</span>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 pt-2">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {event.description}
          </p>

          {/* Registration Section */}
          <div className="rounded-xl border bg-muted/30 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="font-bold text-base">
                {hasSeats ? "Регистрация участника" : "Запись в лист ожидания"}
              </h3>
            </div>

            {regResult ? (
              <div
                className={`p-5 rounded-xl border text-sm space-y-3 ${
                  regResult.status === "CONFIRMED"
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
                    : "bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300"
                }`}
              >
                <div className="font-semibold text-base flex items-center gap-2">
                  {regResult.status === "CONFIRMED" ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  ) : (
                    <Clock className="h-5 w-5 text-amber-600" />
                  )}
                  <span>{regResult.message}</span>
                </div>

                {regResult.status === "CONFIRMED" && regResult.ticketCode && (
                  <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-emerald-500/20">
                    <div>
                      <span className="text-xs block text-muted-foreground">Код вашего билета:</span>
                      <strong className="font-mono text-lg">{regResult.ticketCode}</strong>
                    </div>
                    <Link href={`/tickets/${regResult.ticketCode}`}>
                      <Button size="sm" className="gap-1.5 font-medium shadow-sm">
                        <Ticket className="h-4 w-4" />
                        <span>Открыть билет с QR-кодом</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                )}

                {regResult.status === "WAITLIST" && (
                  <p className="text-xs text-muted-foreground">
                    Ваша позиция в очереди: <strong>№{regResult.waitlistPosition}</strong>.
                    Как только один из подтверждённых участников отменит регистрацию, вы автоматически получите место и билет на почту.
                  </p>
                )}

                <div className="pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7 text-muted-foreground"
                    onClick={() => {
                      setRegResult(null);
                      setEmail("");
                    }}
                  >
                    Зарегистрировать другой email
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleRegister} className="space-y-3">
                {error && (
                  <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-xs font-medium border border-destructive/20 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    type="email"
                    placeholder="Введите ваш рабочий email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-10 text-sm"
                  />
                  <Button type="submit" disabled={submitting} className="h-10 shrink-0 font-medium px-5">
                    {submitting
                      ? "Обработка..."
                      : hasSeats
                      ? "Получить билет"
                      : "Встать в очередь"}
                  </Button>
                </div>

                <p className="text-[11px] text-muted-foreground">
                  * Повторная регистрация на один и тот же email не создает дубликата. За 24 часа до начала вам поступит напоминание.
                </p>
              </form>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
