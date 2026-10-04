"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@workspace/ui/components/chart";
import { Participant } from "@/lib/api";

const chartConfig = {
  registrations: {
    label: "Регистрации",
    color: "hsl(var(--primary, 221.2 83.2% 53.3%))",
  },
  checkins: {
    label: "Чекины на входе",
    color: "#10b981",
  },
} satisfies ChartConfig;

interface AttendanceAreaChartProps {
  participants: Participant[];
  capacity: number;
}

export function AttendanceAreaChart({ participants, capacity }: AttendanceAreaChartProps) {
  // Generate timeline points from participants
  const chartData = React.useMemo(() => {
    if (participants.length === 0) {
      return [
        { time: "09:00", registrations: 0, checkins: 0 },
        { time: "12:00", registrations: 0, checkins: 0 },
        { time: "15:00", registrations: 0, checkins: 0 },
        { time: "18:00", registrations: 0, checkins: 0 },
      ];
    }

    // Sort participants by createdAt
    const sorted = [...participants].sort((a, b) => a.createdAt - b.createdAt);
    const start = sorted[0]?.createdAt ?? Date.now() - 3600000;
    const now = Date.now();
    const duration = Math.max(3600000, now - start); // at least 1 hour window

    const pointsCount = 6;
    const step = duration / pointsCount;

    let cumulativeRegs = 0;
    let cumulativeCheckins = 0;

    const points = [];
    for (let i = 0; i <= pointsCount; i++) {
      const pointTime = start + step * i;
      const regsUpTo = participants.filter((p) => p.createdAt <= pointTime && p.status === "CONFIRMED").length;
      const checkinsUpTo = participants.filter(
        (p) => p.checkedInAt && p.checkedInAt <= pointTime
      ).length;

      const dateObj = new Date(pointTime);
      const timeLabel = dateObj.toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
      });

      points.push({
        time: timeLabel,
        registrations: regsUpTo,
        checkins: checkinsUpTo,
      });
    }

    return points;
  }, [participants]);

  const totalConfirmed = participants.filter((p) => p.status === "CONFIRMED").length;
  const totalCheckedIn = participants.filter((p) => p.ticketStatus === "CHECKED_IN").length;

  return (
    <Card className="border shadow-sm bg-card overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
        <div>
          <CardTitle className="text-base font-bold">
            Динамика регистраций и проходов на входе
          </CardTitle>
          <CardDescription className="text-xs">
            Линейный график заполняемости зала и реальной посещаемости
          </CardDescription>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-primary inline-block" />
            <span className="text-muted-foreground">Билетов: <strong>{totalConfirmed}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" />
            <span className="text-muted-foreground">Пришло: <strong>{totalCheckedIn}</strong></span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <ChartContainer config={chartConfig} className="aspect-auto h-[220px] w-full">
          <AreaChart data={chartData} margin={{ left: 0, right: 12, top: 12, bottom: 0 }}>
            <defs>
              <linearGradient id="fillRegistrations" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-registrations, #3b82f6)" stopOpacity={0.4} />
                <stop offset="95%" stopColor="var(--color-registrations, #3b82f6)" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="fillCheckins" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-checkins, #10b981)" stopOpacity={0.5} />
                <stop offset="95%" stopColor="var(--color-checkins, #10b981)" stopOpacity={0.05} />
              </linearGradient>
            </defs>

            <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.3} />
            <XAxis
              dataKey="time"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={20}
              fontSize={11}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={11}
              domain={[0, Math.max(capacity, 5)]}
            />

            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="line" />}
            />

            <Area
              dataKey="registrations"
              type="monotone"
              fill="url(#fillRegistrations)"
              fillOpacity={0.4}
              stroke="var(--color-registrations, #3b82f6)"
              strokeWidth={2}
              name="Билеты"
            />
            <Area
              dataKey="checkins"
              type="monotone"
              fill="url(#fillCheckins)"
              fillOpacity={0.4}
              stroke="var(--color-checkins, #10b981)"
              strokeWidth={2}
              name="Проходы"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
