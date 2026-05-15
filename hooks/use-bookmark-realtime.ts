"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { signOut } from "next-auth/react";
import { bookmarkCountKey, groupsKey, timelineBookmarksKey } from "@/lib/query-keys";
import type { RealtimeEvent } from "@/lib/realtime";

const INVALIDATE_DEBOUNCE_MS = 120;
const FALLBACK_POLL_MS = 5_000;

export function useBookmarkRealtime(userId: string | null) {
  const queryClient = useQueryClient();
  const lastInvalidateAt = useRef(0);

  useEffect(() => {
    if (!userId) return;

    let eventSource: EventSource | null = null;
    let invalidateTimer: ReturnType<typeof setTimeout> | null = null;
    let fallbackTimer: ReturnType<typeof setInterval> | null = null;
    let closed = false;

    const invalidateBookmarkQueries = () => {
      lastInvalidateAt.current = Date.now();
      void queryClient.invalidateQueries({ queryKey: ["bookmarks", userId] });
      void queryClient.invalidateQueries({ queryKey: groupsKey(userId) });
      void queryClient.invalidateQueries({ queryKey: bookmarkCountKey(userId) });
      void queryClient.invalidateQueries({ queryKey: timelineBookmarksKey(userId) });
    };

    const scheduleInvalidate = () => {
      if (invalidateTimer) return;
      invalidateTimer = setTimeout(() => {
        invalidateTimer = null;
        invalidateBookmarkQueries();
      }, INVALIDATE_DEBOUNCE_MS);
    };

    const ensureFallbackPolling = () => {
      if (fallbackTimer) return;
      fallbackTimer = setInterval(() => {
        if (Date.now() - lastInvalidateAt.current < FALLBACK_POLL_MS - 500) return;
        invalidateBookmarkQueries();
      }, FALLBACK_POLL_MS);
    };

    eventSource = new EventSource("/api/realtime/bookmarks");
    eventSource.onopen = () => {
      if (!fallbackTimer) return;
      clearInterval(fallbackTimer);
      fallbackTimer = null;
    };
    eventSource.onmessage = (evt) => {
      if (!evt?.data) return;
      try {
        const payload = JSON.parse(evt.data) as RealtimeEvent;
        if (payload.userId !== userId) return;
        if (payload.type === "user.deleted") {
          closed = true;
          eventSource?.close();
          void signOut({ redirect: false });
          window.location.href = "/sign-in";
          return;
        }
        scheduleInvalidate();
      } catch {
        // Ignore malformed events and keep the stream alive.
      }
    };
    eventSource.onerror = () => {
      if (!closed) ensureFallbackPolling();
    };

    return () => {
      closed = true;
      if (invalidateTimer) clearTimeout(invalidateTimer);
      if (fallbackTimer) clearInterval(fallbackTimer);
      eventSource?.close();
    };
  }, [queryClient, userId]);
}
