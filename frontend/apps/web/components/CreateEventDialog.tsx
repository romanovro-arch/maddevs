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
import { Calendar, Users, FileText, Sparkles } from "lucide-react";

interface CreateEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEventCreated: (event: EventItem) => void;
}

export function CreateEventDialog({
  open,
  onOpenChange,
  onEventCreated,
}: CreateEventDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  // Default date: tomorrow at 18:00
  const defaultDate = new Date();
  defaultDate.setDate(defaultDate.getDate() + 1);
  defaultDate.setHours(18, 0, 0, 0);

  const [dateStr, setDateStr] = useState(defaultDate.toISOString().slice(0, 16));
  const [capacity, setCapacity] = useState("5");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const dateTime = new Date(dateStr).getTime();
      const cap = parseInt(capacity, 10);

      if (!title.trim()) throw new Error("Укажите название события");
      if (isNaN(dateTime)) throw new Error("Укажите корректную дату");
      if (isNaN(cap) || cap <= 0) throw new Error("Лимит мест должен быть больше 0");

      const created = await api.createEvent({
        title: title.trim(),
        description: description.trim() || "Регистрация открыта. Количество мест строго ограничено.",
        dateTime,
        capacity: cap,
      });

      onEventCreated(created);
      onOpenChange(false);
      // Reset form
      setTitle("");
      setDescription("");
      setCapacity("5");
    } catch (err: any) {
      setError(err.message || "Ошибка создания");
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
              <Sparkles className="h-5 w-5 text-primary" />
              Создать мероприятие
            </DialogTitle>
            <DialogDescription className="text-xs">
              Задайте название, дату проведения и максимальный лимит мест.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="my-3 p-2.5 rounded-lg bg-destructive/10 text-destructive text-xs font-medium border border-destructive/20">
              {error}
            </div>
          )}

          <div className="space-y-4 py-4 text-xs">
            <div>
              <label className="font-semibold block mb-1.5 text-foreground flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                Название события *
              </label>
              <Input
                placeholder="Например: Frontend Meetup 2026"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="font-semibold block mb-1.5 text-foreground flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                Описание
              </label>
              <Input
                placeholder="Краткое описание мероприятия"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold block mb-1.5 text-foreground flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  Дата и время *
                </label>
                <Input
                  type="datetime-local"
                  value={dateStr}
                  onChange={(e) => setDateStr(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="font-semibold block mb-1.5 text-foreground flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  Лимит мест *
                </label>
                <Input
                  type="number"
                  min="1"
                  max="10000"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Создание..." : "Создать событие"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
