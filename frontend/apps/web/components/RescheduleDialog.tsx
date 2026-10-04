"use client";

import { useState } from "react";
import { api, EventItem } from "@/lib/api";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@workspace/ui/components/dialog";
import { Calendar, AlertCircle } from "lucide-react";

interface RescheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: EventItem;
  onUpdated: (event: EventItem) => void;
}

export function RescheduleDialog({
  open,
  onOpenChange,
  event,
  onUpdated,
}: RescheduleDialogProps) {
  const currentIso = new Date(event.dateTime).toISOString().slice(0, 16);
  const [dateStr, setDateStr] = useState(currentIso);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const newDateTime = new Date(dateStr).getTime();
      if (isNaN(newDateTime)) throw new Error("Укажите корректную дату");
      if (newDateTime === event.dateTime) {
        throw new Error("Новая дата совпадает с текущей");
      }

      const updated = await api.updateEvent(event.id, {
        dateTime: newDateTime,
      });

      onUpdated(updated);
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || "Ошибка переноса");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Перенести мероприятие
            </DialogTitle>
            <DialogDescription className="text-xs">
              «{event.title}»
            </DialogDescription>
          </DialogHeader>

          <div className="my-3 p-3 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs border border-amber-500/20 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              <strong>Внимание:</strong> при изменении даты все зарегистрированные участники и люди в листе ожидания моментально получат письмо с новой датой!
            </span>
          </div>

          {error && (
            <div className="my-3 p-2.5 rounded-lg bg-destructive/10 text-destructive text-xs font-medium border border-destructive/20">
              {error}
            </div>
          )}

          <div className="space-y-4 py-3 text-xs">
            <div>
              <label className="font-semibold block mb-1.5 text-foreground">
                Новая дата и время проведения *
              </label>
              <Input
                type="datetime-local"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                required
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 mt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Сохранение и рассылка..." : "Подтвердить перенос"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
