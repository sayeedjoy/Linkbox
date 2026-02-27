export type RealtimeEntity = "bookmark" | "group";

export type RealtimeEventType =
  | "bookmark.created"
  | "bookmark.updated"
  | "bookmark.deleted"
  | "bookmark.category.updated"
  | "group.created"
  | "group.updated"
  | "group.deleted";

export interface RealtimeEvent {
  type: RealtimeEventType;
  userId: string;
  entity: RealtimeEntity;
  id: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

type RealtimeListener = (event: RealtimeEvent) => void;

const userListeners = new Map<string, Set<RealtimeListener>>();

export function subscribeUserEvents(
  userId: string,
  listener: RealtimeListener
): () => void {
  const existing = userListeners.get(userId);
  if (existing) {
    existing.add(listener);
  } else {
    userListeners.set(userId, new Set([listener]));
  }

  return () => {
    const listeners = userListeners.get(userId);
    if (!listeners) return;
    listeners.delete(listener);
    if (listeners.size === 0) {
      userListeners.delete(userId);
    }
  };
}

export function publishUserEvent(
  userId: string,
  payload: Omit<RealtimeEvent, "userId" | "timestamp">
): void {
  const listeners = userListeners.get(userId);
  if (!listeners || listeners.size === 0) return;

  const event: RealtimeEvent = {
    ...payload,
    userId,
    timestamp: new Date().toISOString(),
  };

  for (const listener of listeners) {
    try {
      listener(event);
    } catch {
      // Avoid breaking other subscribers if one listener throws.
    }
  }
}
