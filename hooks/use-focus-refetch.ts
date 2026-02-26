"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { groupsKey, bookmarkCountKey } from "@/lib/query-keys";

const FOCUS_REFETCH_COOLDOWN_MS = 30 * 1000;

export function useFocusRefetch(userId: string | null) {
  const queryClient = useQueryClient();
  const lastRefetchAt = useRef<number>(0);

  useEffect(() => {
    if (!userId) return;

    const onFocus = () => {
      const now = Date.now();
      if (now - lastRefetchAt.current < FOCUS_REFETCH_COOLDOWN_MS) return;
      lastRefetchAt.current = now;
      queryClient.invalidateQueries({ queryKey: groupsKey(userId) });
      queryClient.invalidateQueries({ queryKey: ["bookmarks", userId] });
      queryClient.invalidateQueries({ queryKey: bookmarkCountKey(userId) });
    };

    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [queryClient, userId]);
}
