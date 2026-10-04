"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { WS_URL, EventStats } from "@/lib/api";

export interface LiveCheckInEvent {
  ticketCode: string;
  email: string;
  checkedInAt: number;
}

export function useEventLiveStats(eventId?: number) {
  const [stats, setStats] = useState<EventStats | null>(null);
  const [lastCheckIn, setLastCheckIn] = useState<LiveCheckInEvent | null>(null);
  const [connected, setConnected] = useState(false);
  const [recentNotification, setRecentNotification] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);

  const connect = useCallback(() => {
    if (!eventId) return;

    try {
      const ws = new WebSocket(`${WS_URL}/ws?eventId=${eventId}`);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "INITIAL_STATS" && data.stats) {
            setStats(data.stats);
          } else if (data.type === "CHECKIN_SUCCESS") {
            if (data.stats) setStats(data.stats);
            if (data.lastCheckIn) {
              setLastCheckIn(data.lastCheckIn);
              setRecentNotification(`🟢 Вход: ${data.lastCheckIn.email} (${data.lastCheckIn.ticketCode})`);
              setTimeout(() => setRecentNotification(null), 5000);
            }
          } else if (data.stats) {
            setStats(data.stats);
            if (data.type === "REGISTRATION_CONFIRMED") {
              setRecentNotification("🎉 Новая регистрация!");
              setTimeout(() => setRecentNotification(null), 4000);
            } else if (data.type === "REGISTRATION_CANCELLED" && data.promotedEmail) {
              setRecentNotification(`🔄 Место освободилось! Участник ${data.promotedEmail} получил билет из листа ожидания.`);
              setTimeout(() => setRecentNotification(null), 6000);
            }
          }
        } catch (e) {
          console.error("WS Parse error", e);
        }
      };

      ws.onclose = () => {
        setConnected(false);
        // Automatic reconnection attempt after 3 seconds
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch (e) {
      console.error("WebSocket connection error", e);
    }
  }, [eventId]);

  useEffect(() => {
    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  return { stats, setStats, lastCheckIn, connected, recentNotification };
}
