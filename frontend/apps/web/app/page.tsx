"use client";

import { useEffect, useState } from "react";
import { api, EventItem } from "@/lib/api";
import Link from "next/link";
import { Button } from "@workspace/ui/components/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { CreateEventDialog } from "@/components/CreateEventDialog";
import {
  Calendar,
  Users,
  Ticket,
  QrCode,
  LayoutDashboard,
  ShieldCheck,
  Zap,
  ArrowRight,
  Clock,
  Sparkles,
} from "lucide-react";

export default function HomePage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const data = await api.getEvents();
      setEvents(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  return (
    <div className="container mx-auto px-4 sm:px-8 py-8 space-y-10 max-w-6xl">
      {/* Hero Header */}
      <div className="relative rounded-2xl border bg-gradient-to-br from-card via-card to-primary/5 p-8 sm:p-10 shadow-sm overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1 text-xs font-medium text-foreground backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>Инженерный сервис бронирования и регистрации</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            События с контролем мест и мгновенным чекином
          </h1>

          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Атомарные транзакции против Race Condition на последнее место, автоматический лист ожидания (FIFO) при отмене и real-time счётчик организатора.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Button onClick={() => setCreateDialogOpen(true)} className="gap-2 shadow-sm">
              <span>+ Создать событие</span>
            </Button>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> ACID транзакции</span>
              <span>•</span>
              <span className="flex items-center gap-1"><Zap className="h-3.5 w-3.5 text-blue-500" /> WebSockets</span>
            </div>
          </div>
        </div>
      </div>

      {/* Events Listing */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Актуальные события</h2>
            <p className="text-xs text-muted-foreground">Выберите событие для регистрации или управления</p>
          </div>
          <Button variant="outline" size="sm" onClick={loadEvents} className="text-xs">
            Обновить список
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 rounded-xl border bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-16 border rounded-xl bg-card/40 space-y-3">
            <Ticket className="h-10 w-10 text-muted-foreground mx-auto" />
            <h3 className="font-semibold text-lg">Событий пока не создано</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Создайте первое мероприятие, чтобы протестировать регистрацию, лист ожидания и live-чекин.
            </p>
            <Button onClick={() => setCreateDialogOpen(true)} size="sm">
              Создать мероприятие
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => {
              const stats = event.stats;
              const seatsLeft = stats ? stats.seatsLeft : event.capacity;
              const confirmedCount = stats ? stats.confirmedCount : 0;
              const waitlistCount = stats ? stats.waitlistCount : 0;
              const hasSeats = seatsLeft > 0;
              const fillPercentage = Math.min(100, Math.round((confirmedCount / event.capacity) * 100));

              const dateStr = new Date(event.dateTime).toLocaleString("ru-RU", {
                timeZone: "UTC",
                dateStyle: "medium",
                timeStyle: "short",
              });

              return (
                <Card
                  key={event.id}
                  className="flex flex-col justify-between hover:border-primary/50 transition-all hover:shadow-md bg-card"
                >
                  <CardHeader className="space-y-2 pb-3">
                    <div className="flex items-center justify-between gap-2">
                      {hasSeats ? (
                        <Badge variant="default" className="text-[11px] bg-emerald-600 hover:bg-emerald-600 text-white">
                          Осталось мест: {seatsLeft}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[11px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                          Лист ожидания ({waitlistCount})
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        Лимит: {event.capacity}
                      </span>
                    </div>

                    <CardTitle className="text-lg font-bold line-clamp-1">
                      {event.title}
                    </CardTitle>
                    <CardDescription className="text-xs line-clamp-2 min-h-[32px]">
                      {event.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-3 pb-3 text-xs">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5 text-primary" />
                      <span>{dateStr}</span>
                    </div>

                    {/* Capacity Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-muted-foreground">
                        <span>Занято мест: {confirmedCount}/{event.capacity}</span>
                        <span>{fillPercentage}%</span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            fillPercentage >= 100 ? "bg-amber-500" : "bg-primary"
                          }`}
                          style={{ width: `${fillPercentage}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="pt-2 flex flex-col gap-2 border-t bg-muted/20">
                    <Link href={`/events/${event.id}`} className="w-full">
                      <Button className="w-full text-xs font-semibold gap-1.5 h-9">
                        <span>{hasSeats ? "Зарегистрироваться" : "В лист ожидания"}</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>

                    <div className="grid grid-cols-2 gap-2 w-full">
                      <Link href={`/events/${event.id}/dashboard`} className="w-full">
                        <Button variant="outline" size="sm" className="w-full text-[11px] gap-1 h-8">
                          <LayoutDashboard className="h-3 w-3" />
                          <span>Дашборд</span>
                        </Button>
                      </Link>
                      <Link href={`/events/${event.id}/checkin`} className="w-full">
                        <Button variant="outline" size="sm" className="w-full text-[11px] gap-1 h-8">
                          <QrCode className="h-3 w-3" />
                          <span>Чекин на входе</span>
                        </Button>
                      </Link>
                    </div>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <CreateEventDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onEventCreated={(newEvent) => {
          setEvents((prev) => [newEvent, ...prev]);
        }}
      />
    </div>
  );
}
