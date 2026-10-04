import { createBunWebSocket } from "hono/bun";
import type { ServerWebSocket } from "bun";

export interface EventLiveStats {
  eventId: number;
  capacity: number;
  confirmedCount: number;
  waitlistCount: number;
  checkedInCount: number;
  lastCheckIn?: {
    ticketCode: string;
    email: string;
    checkedInAt: number;
  };
}

// Map eventId -> Set of WebSockets
const eventSubscribers = new Map<number, Set<any>>();

export const { upgradeWebSocket, websocket } = createBunWebSocket<ServerWebSocket>();

export function subscribeToEvent(eventId: number, ws: any) {
  if (!eventSubscribers.has(eventId)) {
    eventSubscribers.set(eventId, new Set());
  }
  eventSubscribers.get(eventId)!.add(ws);
}

export function unsubscribeFromEvent(eventId: number, ws: any) {
  const subscribers = eventSubscribers.get(eventId);
  if (subscribers) {
    subscribers.delete(ws);
    if (subscribers.size === 0) {
      eventSubscribers.delete(eventId);
    }
  }
}

export function broadcastEventStats(eventId: number, data: any) {
  const subscribers = eventSubscribers.get(eventId);
  if (!subscribers || subscribers.size === 0) return;

  const payload = JSON.stringify(data);
  for (const ws of subscribers) {
    try {
      ws.send(payload);
    } catch (e) {
      subscribers.delete(ws);
    }
  }
}
