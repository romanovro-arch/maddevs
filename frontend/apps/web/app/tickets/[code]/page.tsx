"use client";

import { use, useEffect, useState } from "react";
import { api, TicketDetails } from "@/lib/api";
import { TicketCard } from "@/components/TicketCard";
import Link from "next/link";
import { Button } from "@workspace/ui/components/button";
import { ArrowLeft, Ticket } from "lucide-react";

export default function TicketPage({ params }: { params: Promise<{ code: string }> }) {
  const resolvedParams = use(params);
  const code = resolvedParams.code;

  const [ticket, setTicket] = useState<TicketDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTicket = async () => {
    try {
      const data = await api.getTicket(code);
      setTicket(data);
    } catch (err: any) {
      setError(err.message || "Билет не найден");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTicket();
  }, [code]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-20 text-center max-w-md">
        <div className="h-96 rounded-2xl border bg-muted/40 animate-pulse" />
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="container mx-auto px-4 py-20 text-center max-w-md space-y-4">
        <div className="text-destructive font-bold text-lg">{error || "Билет не найден"}</div>
        <p className="text-xs text-muted-foreground">
          Проверьте правильность ссылки или кода билета.
        </p>
        <Link href="/">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" /> На главную
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-8 py-10 max-w-lg space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href={`/events/${ticket.eventId}`}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> К мероприятию
        </Link>

        <span className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
          <Ticket className="h-3.5 w-3.5" /> {ticket.code}
        </span>
      </div>

      <TicketCard ticket={ticket} />
    </div>
  );
}
