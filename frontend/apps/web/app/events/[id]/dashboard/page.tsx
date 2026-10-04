"use client";

import { use, useEffect, useState } from "react";
import { api, EventItem, Participant } from "@/lib/api";
import { useEventLiveStats } from "@/hooks/useEventLiveStats";
import Link from "next/link";
import { Button } from "@workspace/ui/components/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@workspace/ui/components/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";
import { RescheduleDialog } from "@/components/RescheduleDialog";
import { AttendanceAreaChart } from "@/components/AttendanceAreaChart";
import {
  Users,
  Clock,
  DoorOpen,
  Calendar,
  ArrowLeft,
  QrCode,
  Radio,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Download,
} from "lucide-react";

export default function DashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const eventId = Number(resolvedParams.id);

  const [event, setEvent] = useState<EventItem | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);

  // Real-time WebSocket hook for live stats and notifications
  const { stats: liveStats, connected, recentNotification } = useEventLiveStats(eventId);

  const loadData = async () => {
    try {
      const [eventData, participantsData] = await Promise.all([
        api.getEvent(eventId),
        api.getParticipants(eventId),
      ]);
      setEvent(eventData.event);
      setParticipants(participantsData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [eventId]);

  // When liveStats updates, refresh participants list if needed
  useEffect(() => {
    if (liveStats) {
      api.getParticipants(eventId).then(setParticipants).catch(console.error);
    }
  }, [liveStats, eventId]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center max-w-4xl">
        <div className="h-64 rounded-xl border bg-muted/40 animate-pulse" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="container mx-auto px-4 py-16 text-center max-w-md">
        <p className="text-destructive font-semibold">Событие не найдено</p>
        <Link href="/" className="mt-4 inline-block">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" /> На главную
          </Button>
        </Link>
      </div>
    );
  }

  const confirmedCount = liveStats ? liveStats.confirmedCount : 0;
  const waitlistCount = liveStats ? liveStats.waitlistCount : 0;
  const checkedInCount = liveStats ? liveStats.checkedInCount : 0;
  const capacity = event.capacity;
  const turnoutPercent = confirmedCount > 0 ? Math.round((checkedInCount / confirmedCount) * 100) : 0;

  const confirmedList = participants.filter((p) => p.status === "CONFIRMED");
  const waitlistList = participants.filter((p) => p.status === "WAITLIST");

  const formattedDate = new Date(event.dateTime).toLocaleString("ru-RU", {
    timeZone: "UTC",
    dateStyle: "full",
    timeStyle: "short",
  });

  const exportCsv = () => {
    const headers = ["#", "Email", "Статус", "Код билета", "Статус билета", "Время входа"];
    const rows = participants.map((p, idx) => [
      idx + 1,
      p.email,
      p.status,
      p.ticketCode || "—",
      p.ticketStatus || "—",
      p.checkedInAt ? new Date(p.checkedInAt).toLocaleString("ru-RU") : "—",
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(";"), ...rows.map((e) => e.join(";"))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `attendees_${event.id}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="container mx-auto px-4 sm:px-8 py-8 max-w-6xl space-y-8">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <Link
            href={`/events/${eventId}`}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> К странице события
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Дашборд организатора
            </h1>
            <Badge
              variant={connected ? "default" : "secondary"}
              className={`text-[11px] gap-1.5 ${
                connected
                  ? "bg-emerald-600 hover:bg-emerald-600 text-white"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <Radio className={`h-3 w-3 ${connected ? "animate-pulse" : ""}`} />
              {connected ? "Live канал активен" : "Подключение..."}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            «{event.title}» • {formattedDate}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRescheduleOpen(true)}
            className="text-xs h-9 gap-1.5"
          >
            <Calendar className="h-3.5 w-3.5 text-primary" />
            <span>Перенести дату</span>
          </Button>

          <Link href={`/events/${eventId}/checkin`}>
            <Button size="sm" className="text-xs h-9 gap-1.5 shadow-sm font-semibold">
              <QrCode className="h-3.5 w-3.5" />
              <span>Экран чекина</span>
            </Button>
          </Link>

          <Button
            variant="ghost"
            size="icon"
            onClick={loadData}
            title="Обновить данные"
            className="h-9 w-9"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Live notification banner */}
      {recentNotification && (
        <div className="p-3.5 rounded-xl border bg-primary/10 border-primary/20 text-xs font-semibold text-primary flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
          <Sparkles className="h-4 w-4 animate-spin text-primary" />
          <span>{recentNotification}</span>
        </div>
      )}

      {/* 4 Key Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Confirmed */}
        <Card className="bg-card shadow-sm border">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs flex items-center justify-between">
              <span>Зарегистрировано</span>
              <Users className="h-4 w-4 text-emerald-500" />
            </CardDescription>
            <CardTitle className="text-2xl sm:text-3xl font-black">
              {confirmedCount} <span className="text-sm font-normal text-muted-foreground">/ {capacity}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
            {Math.max(0, capacity - confirmedCount)} мест свободно
          </CardContent>
        </Card>

        {/* Waitlist */}
        <Card className="bg-card shadow-sm border">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs flex items-center justify-between">
              <span>Лист ожидания</span>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardDescription>
            <CardTitle className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">
              {waitlistCount}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
            Очередь по правилу FIFO
          </CardContent>
        </Card>

        {/* Checked In (Live) */}
        <Card className="bg-card shadow-sm border ring-2 ring-primary/20">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs flex items-center justify-between">
              <span className="font-semibold text-primary flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                Пришло (Live)
              </span>
              <DoorOpen className="h-4 w-4 text-primary" />
            </CardDescription>
            <CardTitle className="text-2xl sm:text-3xl font-black text-primary">
              {checkedInCount}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
            Обновляется в реальном времени
          </CardContent>
        </Card>

        {/* Turnout Percentage */}
        <Card className="bg-card shadow-sm border">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs flex items-center justify-between">
              <span>Явка участников</span>
              <CheckCircle2 className="h-4 w-4 text-blue-500" />
            </CardDescription>
            <CardTitle className="text-2xl sm:text-3xl font-black">
              {turnoutPercent}%
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${turnoutPercent}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Real-time Attendance & Registration Area Chart */}
      <AttendanceAreaChart participants={participants} capacity={capacity} />

      {/* Participants & Waitlist Tabs Table */}
      <Card className="border shadow-sm bg-card overflow-hidden">
        <Tabs defaultValue="confirmed" className="w-full">
          <CardHeader className="border-b pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-lg font-bold">Списки участников</CardTitle>
                <CardDescription className="text-xs">
                  Управление регистрациями, проверка билетов и позиций очереди
                </CardDescription>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportCsv}
                  className="text-xs h-9 gap-1.5 shrink-0"
                  title="Скачать список участников в формате CSV"
                >
                  <Download className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Экспорт CSV</span>
                </Button>

                <TabsList className="grid grid-cols-2 w-full sm:w-auto">
                  <TabsTrigger value="confirmed" className="text-xs gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    <span>Участники ({confirmedList.length})</span>
                  </TabsTrigger>
                  <TabsTrigger value="waitlist" className="text-xs gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Лист ожидания ({waitlistList.length})</span>
                  </TabsTrigger>
                </TabsList>
              </div>
            </div>
          </CardHeader>

          {/* Confirmed Attendees Tab */}
          <TabsContent value="confirmed" className="m-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-12 text-xs">#</TableHead>
                  <TableHead className="text-xs">Email</TableHead>
                  <TableHead className="text-xs">Код билета</TableHead>
                  <TableHead className="text-xs">Статус билета</TableHead>
                  <TableHead className="text-xs">Время входа</TableHead>
                  <TableHead className="text-right text-xs">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {confirmedList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-xs text-muted-foreground">
                      Зарегистрированных участников пока нет.
                    </TableCell>
                  </TableRow>
                ) : (
                  confirmedList.map((p, idx) => {
                    const isCheckedIn = p.ticketStatus === "CHECKED_IN";
                    const checkInTime = p.checkedInAt
                      ? new Date(p.checkedInAt).toLocaleTimeString("ru-RU", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })
                      : "—";

                    return (
                      <TableRow key={p.id} className="text-xs">
                        <TableCell className="text-muted-foreground font-mono">{idx + 1}</TableCell>
                        <TableCell className="font-medium text-foreground">{p.email}</TableCell>
                        <TableCell className="font-mono font-bold">{p.ticketCode || "—"}</TableCell>
                        <TableCell>
                          {isCheckedIn ? (
                            <Badge variant="default" className="text-[10px] bg-blue-600 hover:bg-blue-600 text-white gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Пришёл
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-600/30 gap-1">
                              Выдан
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{checkInTime}</TableCell>
                        <TableCell className="text-right">
                          {p.ticketCode && (
                            <Link href={`/tickets/${p.ticketCode}`} target="_blank">
                              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                                <span>Билет</span>
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            </Link>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TabsContent>

          {/* Waitlist Tab */}
          <TabsContent value="waitlist" className="m-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-16 text-xs">Очередь</TableHead>
                  <TableHead className="text-xs">Email</TableHead>
                  <TableHead className="text-xs">Время регистрации</TableHead>
                  <TableHead className="text-xs">Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {waitlistList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-12 text-xs text-muted-foreground">
                      В листе ожидания никого нет.
                    </TableCell>
                  </TableRow>
                ) : (
                  waitlistList.map((p, idx) => (
                    <TableRow key={p.id} className="text-xs">
                      <TableCell className="font-bold text-amber-600 font-mono">
                        №{idx + 1}
                      </TableCell>
                      <TableCell className="font-medium text-foreground">{p.email}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(p.createdAt).toLocaleString("ru-RU", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                          Ждёт освобождения места
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </Card>

      {/* Reschedule Event Modal */}
      {event && (
        <RescheduleDialog
          open={rescheduleOpen}
          onOpenChange={setRescheduleOpen}
          event={event}
          onUpdated={(updated) => {
            setEvent(updated);
          }}
        />
      )}
    </div>
  );
}
