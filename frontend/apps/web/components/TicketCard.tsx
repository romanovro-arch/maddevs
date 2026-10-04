"use client";

import { useState } from "react";
import { TicketDetails, api } from "@/lib/api";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@workspace/ui/components/dialog";
import { Calendar, User, CheckCircle2, AlertTriangle, XCircle, Copy, Check } from "lucide-react";

interface TicketCardProps {
  ticket: TicketDetails;
  onCancelled?: (promotedEmail?: string) => void;
}

export function TicketCard({ ticket: initialTicket, onCancelled }: TicketCardProps) {
  const [ticket, setTicket] = useState(initialTicket);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [copied, setCopied] = useState(false);
  const [cancelFeedback, setCancelFeedback] = useState<string | null>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(ticket.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCancelRegistration = async () => {
    setCancelling(true);
    try {
      const res = await api.cancelByTicket(ticket.code);
      setTicket((prev) => ({
        ...prev,
        status: "REVOKED",
        registrationStatus: "CANCELLED",
      }));
      setCancelDialogOpen(false);
      setCancelFeedback(
        res.promotedEmail
          ? `Регистрация отменена. Место передано участнику ${res.promotedEmail} из листа ожидания!`
          : "Регистрация успешно отменена."
      );
      if (onCancelled) onCancelled(res.promotedEmail);
    } catch (err: any) {
      alert("Ошибка при отмене: " + err.message);
    } finally {
      setCancelling(false);
    }
  };

  const formattedDate = new Date(ticket.eventDateTime).toLocaleString("ru-RU", {
    timeZone: "UTC",
    dateStyle: "full",
    timeStyle: "short",
  });

  return (
    <>
      <Card className="w-full max-w-md mx-auto shadow-2xl border-2 border-border/80 overflow-hidden relative bg-card">
        {/* Decorative ticket notch styling */}
        <div className="absolute -left-3 top-1/2 -mt-3 h-6 w-6 rounded-full bg-background border border-border" />
        <div className="absolute -right-3 top-1/2 -mt-3 h-6 w-6 rounded-full bg-background border border-border" />

        <CardHeader className="text-center pb-2 pt-6">
          <div className="flex justify-center mb-2">
            {ticket.status === "ISSUED" && (
              <Badge variant="default" className="gap-1.5 px-3 py-1 text-xs bg-emerald-600 hover:bg-emerald-600 text-white">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Билет действителен
              </Badge>
            )}
            {ticket.status === "CHECKED_IN" && (
              <Badge variant="secondary" className="gap-1.5 px-3 py-1 text-xs bg-blue-600 text-white hover:bg-blue-600">
                <Check className="h-3.5 w-3.5" />
                Использован на входе
              </Badge>
            )}
            {ticket.status === "REVOKED" && (
              <Badge variant="destructive" className="gap-1.5 px-3 py-1 text-xs">
                <XCircle className="h-3.5 w-3.5" />
                Аннулирован
              </Badge>
            )}
          </div>

          <CardTitle className="text-2xl font-bold tracking-tight">
            {ticket.eventTitle}
          </CardTitle>
          <CardDescription className="text-xs flex items-center justify-center gap-1.5 mt-1">
            <Calendar className="h-3.5 w-3.5 text-primary" />
            {formattedDate}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 pt-4 text-center">
          {/* QR Code Container */}
          <div className="inline-block p-4 rounded-2xl bg-white border shadow-inner">
            <QRCodeSVG
              value={ticket.code}
              size={180}
              level="H"
              marginSize={2}
            />
          </div>

          {/* Ticket Code with Copy Button */}
          <div className="flex items-center justify-center gap-2">
            <span className="font-mono text-2xl font-black tracking-widest text-foreground bg-muted px-4 py-1.5 rounded-lg border">
              {ticket.code}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10"
              onClick={handleCopy}
              title="Скопировать код"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          {ticket.status === "CHECKED_IN" && ticket.checkedInAt && (
            <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-600 dark:text-blue-400">
              Вход выполнен: {new Date(ticket.checkedInAt).toLocaleTimeString("ru-RU")}
            </div>
          )}

          {cancelFeedback && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400">
              {cancelFeedback}
            </div>
          )}

          <div className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
            <User className="h-3.5 w-3.5" />
            Участник: <span className="font-medium text-foreground">{ticket.email}</span>
          </div>
        </CardContent>

        {/* Cancellation Option */}
        {ticket.status === "ISSUED" && (
          <CardFooter className="pt-2 pb-6 flex flex-col gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={() => setCancelDialogOpen(true)}
            >
              Не сможете прийти? Отказаться от участия
            </Button>
          </CardFooter>
        )}
      </Card>

      {/* Cancellation Confirmation Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-lg flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Отказаться от участия?
            </DialogTitle>
            <DialogDescription className="text-xs pt-1">
              Ваш билет <strong>{ticket.code}</strong> будет аннулирован. Если в листе ожидания есть участники, первый из них автоматически получит ваше место!
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button
              variant="outline"
              onClick={() => setCancelDialogOpen(false)}
              disabled={cancelling}
            >
              Оставить билет
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelRegistration}
              disabled={cancelling}
            >
              {cancelling ? "Отмена..." : "Да, отказаться от места"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
