"use client";

import { use, useEffect, useState, useRef } from "react";
import { api, EventItem } from "@/lib/api";
import Link from "next/link";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import {
  QrCode,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  LayoutDashboard,
  Clock,
  Sparkles,
  Zap,
} from "lucide-react";

interface ScanLogItem {
  id: string;
  code: string;
  success: boolean;
  status: string;
  message: string;
  time: string;
  email?: string;
}

export default function CheckInPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const eventId = Number(resolvedParams.id);

  const [event, setEvent] = useState<EventItem | null>(null);
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    code: string;
    message: string;
    ticket?: any;
  } | null>(null);

  const [recentScans, setRecentScans] = useState<ScanLogItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getEvent(eventId);
        setEvent(data.event);
      } catch (e) {
        console.error(e);
      }
    }
    load();
  }, [eventId]);

  const handleCheckIn = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) return;

    setChecking(true);
    setResult(null);

    try {
      const res = await api.checkIn(cleanCode);
      setResult(res);

      const logItem: ScanLogItem = {
        id: Math.random().toString(),
        code: cleanCode,
        success: res.success,
        status: res.code,
        message: res.message,
        time: new Date().toLocaleTimeString("ru-RU"),
        email: res.ticket?.email,
      };

      setRecentScans((prev) => [logItem, ...prev.slice(0, 9)]);
      setCode("");
    } catch (err: any) {
      setResult({
        success: false,
        code: "ERROR",
        message: err.message || "Ошибка соединения",
      });
    } finally {
      setChecking(false);
      // Keep focus on input for fast scanning
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  return (
    <div className="container mx-auto px-4 sm:px-8 py-8 max-w-2xl space-y-6">
      {/* Navigation header */}
      <div className="flex items-center justify-between">
        <Link
          href={`/events/${eventId}`}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Страница события
        </Link>

        <Link href={`/events/${eventId}/dashboard`}>
          <Button variant="outline" size="sm" className="text-xs h-8 gap-1.5">
            <LayoutDashboard className="h-3.5 w-3.5 text-primary" />
            <span>Дашборд организатора</span>
          </Button>
        </Link>
      </div>

      {/* Main Check-in Card */}
      <Card className="border-2 shadow-xl bg-card">
        <CardHeader className="text-center pb-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-2">
            <QrCode className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            Контроль билетов на входе
          </CardTitle>
          <CardDescription className="text-xs">
            {event?.title || "Мероприятие"} • Введите или отсканируйте код билета
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Input Form */}
          <form onSubmit={handleCheckIn} className="space-y-3">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                placeholder="MAD-XXXXXX"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoFocus
                className="h-12 font-mono text-center text-xl font-bold uppercase tracking-wider bg-background"
              />
              <Button
                type="submit"
                disabled={checking || !code.trim()}
                className="h-12 px-6 font-semibold"
              >
                {checking ? "Проверка..." : "Отметить вход"}
              </Button>
            </div>
            <div className="text-[11px] text-muted-foreground text-center">
              Поддерживается клавиатурный ввод и стандартные 2D/QR-сканеры
            </div>
          </form>

          {/* Big Visual Status Alert Banner */}
          {result && (
            <div
              className={`p-5 rounded-2xl border transition-all text-center space-y-2 animate-in zoom-in-95 duration-200 ${
                result.success
                  ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-800 dark:text-emerald-300"
                  : result.code === "ALREADY_CHECKED_IN"
                  ? "bg-destructive/15 border-destructive/40 text-destructive dark:text-destructive"
                  : "bg-amber-500/15 border-amber-500/40 text-amber-800 dark:text-amber-300"
              }`}
            >
              <div className="flex items-center justify-center gap-2 text-lg font-bold">
                {result.success && <CheckCircle2 className="h-6 w-6 text-emerald-600" />}
                {result.code === "ALREADY_CHECKED_IN" && <XCircle className="h-6 w-6 text-destructive" />}
                {!result.success && result.code !== "ALREADY_CHECKED_IN" && (
                  <AlertTriangle className="h-6 w-6 text-amber-600" />
                )}
                <span>
                  {result.success
                    ? "ПРОХОД РАЗРЕШЕН"
                    : result.code === "ALREADY_CHECKED_IN"
                    ? "ПОВТОРНЫЙ ВХОД ЗАПРЕЩЕН!"
                    : "ОШИБКА БИЛЕТА"}
                </span>
              </div>

              <p className="text-sm font-medium">{result.message}</p>

              {result.ticket && (
                <div className="pt-2 text-xs border-t border-current/15 flex justify-center items-center gap-4">
                  <span>Участник: <strong>{result.ticket.email}</strong></span>
                  <span>Код: <strong className="font-mono">{result.ticket.code}</strong></span>
                </div>
              )}
            </div>
          )}

          {/* Recent Scans Log on this station */}
          {recentScans.length > 0 && (
            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  История сканирований на этом посте
                </span>
                <span>{recentScans.length} зап.</span>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {recentScans.map((scan) => (
                  <div
                    key={scan.id}
                    className="flex items-center justify-between text-xs p-2 rounded-lg border bg-muted/20"
                  >
                    <div className="flex items-center gap-2">
                      {scan.success ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive shrink-0" />
                      )}
                      <span className="font-mono font-bold">{scan.code}</span>
                      {scan.email && <span className="text-muted-foreground truncate max-w-[150px]">{scan.email}</span>}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant={scan.success ? "default" : "destructive"}
                        className="text-[10px] px-1.5 py-0"
                      >
                        {scan.status}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">{scan.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
