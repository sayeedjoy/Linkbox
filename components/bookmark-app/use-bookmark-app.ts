"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useDeferredValue } from "react";
import { useQueryState } from "nuqs";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { BookmarkWithGroup } from "@/app/actions/bookmarks";
import type { GroupWithCount } from "@/lib/types";
import { getBookmarks, getTotalBookmarkCount, createBookmark, createNote, createBookmarkFromMetadata, updateBookmark, deleteBookmark, refreshBookmark } from "@/app/actions/bookmarks";
import { getGroups } from "@/app/actions/groups";
import { parseTextForUrls, parseImageForUrls, unfurlUrl } from "@/app/actions/parse";
import { filterBookmarks, makeOptimisticBookmark } from "./utils";
import { groupsKey, bookmarksKey, bookmarkCountKey, timelineBookmarksKey } from "@/lib/query-keys";
import type { RealtimeEvent } from "@/lib/realtime";

const OPT_PREFIX = "opt-";
const LAST_GROUP_KEY = "bookmark-last-group";
type UIBookmark = BookmarkWithGroup & { _clientKey?: string; _optimistic?: boolean };

export function useBookmarkApp({
  initialBookmarks,
  initialGroups,
  initialSelectedGroupId,
  initialTotalBookmarkCount = 0,
}: {
  initialBookmarks: BookmarkWithGroup[];
  initialGroups: GroupWithCount[];
  initialSelectedGroupId?: string | null;
  initialTotalBookmarkCount?: number;
}) {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const userId = session?.user?.id ?? null;

  const mountedAtRef = useRef<number>(0);
  if (mountedAtRef.current === 0 && typeof window !== "undefined") {
    mountedAtRef.current = Date.now();
  }
  const mountedAt = mountedAtRef.current;

  const [groupParam, setGroupParam] = useQueryState("group");
  const selectedGroupId = groupParam ?? null;
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState(false);
  const sortKey = "createdAt" as const;
  const sortOrder = "desc" as const;
  const [inputValue, setInputValue] = useState("");
  const [previewBookmark, setPreviewBookmark] = useState<BookmarkWithGroup | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setSelectionMode(false);
    setBulkDeleteConfirmOpen(false);
  }, []);

  const handleBulkMove = useCallback(() => setMoveDialogOpen(true), []);

  const enterSelectionWithBookmark = useCallback((id: string) => {
    setSelectionMode(true);
    setSelectedIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!userId) return;
    const eventSource = new EventSource("/api/realtime/bookmarks");
    let invalidateTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleInvalidate = () => {
      if (invalidateTimer) return;
      invalidateTimer = setTimeout(() => {
        invalidateTimer = null;
        void queryClient.invalidateQueries({ queryKey: ["bookmarks", userId] });
        void queryClient.invalidateQueries({ queryKey: groupsKey(userId) });
        void queryClient.invalidateQueries({ queryKey: bookmarkCountKey(userId) });
        void queryClient.invalidateQueries({ queryKey: timelineBookmarksKey(userId) });
      }, 120);
    };

    eventSource.onmessage = (evt) => {
      if (!evt?.data) return;
      try {
        const payload = JSON.parse(evt.data) as RealtimeEvent;
        if (payload.userId !== userId) return;
        scheduleInvalidate();
      } catch {
        // Ignore malformed events and keep the stream alive.
      }
    };

    return () => {
      if (invalidateTimer) clearTimeout(invalidateTimer);
      eventSource.close();
    };
  }, [queryClient, userId]);

  const groupsQuery = useQuery({
    queryKey: userId ? groupsKey(userId) : ["groups", "anon"],
    queryFn: () => getGroups(),
    enabled: !!userId,
    initialData: initialGroups.length > 0 ? initialGroups : undefined,
    initialDataUpdatedAt: (initialGroups.length > 0 && mountedAt) ? mountedAt : undefined,
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });
  const groups = useMemo(() => groupsQuery.data ?? initialGroups, [groupsQuery.data, initialGroups]);

  const shouldUseInitialBookmarks =
    initialBookmarks.length > 0 &&
    selectedGroupId === initialSelectedGroupId;
  const bookmarksQuery = useQuery({
    queryKey: userId ? bookmarksKey(userId, selectedGroupId, sortKey, sortOrder) : ["bookmarks", "anon"],
    queryFn: () =>
      getBookmarks({
        groupId: selectedGroupId,
        sort: sortKey,
        order: sortOrder,
      }),
    enabled: !!userId,
    initialData: shouldUseInitialBookmarks ? initialBookmarks : undefined,
    initialDataUpdatedAt: (shouldUseInitialBookmarks && mountedAt) ? mountedAt : undefined,
    placeholderData: (previousData) => previousData,
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });
  const bookmarks = useMemo(
    () => bookmarksQuery.data ?? (shouldUseInitialBookmarks ? initialBookmarks : []),
    [bookmarksQuery.data, initialBookmarks, shouldUseInitialBookmarks]
  );
  const isTransitionLoading = false;

  const countQuery = useQuery({
    queryKey: userId ? bookmarkCountKey(userId) : ["bookmark-count", "anon"],
    queryFn: () => getTotalBookmarkCount(),
    enabled: !!userId,
    initialData: mountedAt ? initialTotalBookmarkCount : undefined,
    initialDataUpdatedAt: mountedAt || undefined,
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });
  const totalBookmarkCount = countQuery.data ?? initialTotalBookmarkCount;

  const displayedBookmarks = useMemo(
    () => (searchMode ? filterBookmarks(bookmarks, deferredSearchQuery) : bookmarks),
    [searchMode, bookmarks, deferredSearchQuery]
  );

  const adjustCount = useCallback(
    (delta: number) => {
      if (!userId) return;
      const key = bookmarkCountKey(userId);
      queryClient.setQueryData<number>(key, (old) => {
        const next = (old ?? 0) + delta;
        return next < 0 ? 0 : next;
      });
    },
    [queryClient, userId]
  );

  const adjustGroupCount = useCallback(
    (groupId: string | null | undefined, delta: number) => {
      if (!userId || !groupId || delta === 0) return;
      queryClient.setQueryData<GroupWithCount[]>(groupsKey(userId), (old) =>
        old?.map((group) =>
          group.id === groupId
            ? {
                ...group,
                _count: { ...group._count, bookmarks: Math.max(0, group._count.bookmarks + delta) },
              }
            : group
        ) ?? old
      );
    },
    [queryClient, userId]
  );

  const refreshGroups = useCallback(() => {
    if (userId) queryClient.invalidateQueries({ queryKey: groupsKey(userId) });
  }, [queryClient, userId]);

  type CreateBookmarkVars = {
    url: string;
    options?: { groupId?: string | null; title?: string; description?: string };
  };
  type CreateNoteVars = { content: string; groupId?: string | null };
  type CreateFromMetadataVars = {
    url: string;
    metadata: { title?: string | null; description?: string | null; faviconUrl?: string | null; previewImageUrl?: string | null };
    groupId?: string | null;
  };
  type OptimisticContext = {
    previousBookmarkEntries: [unknown[], UIBookmark[] | undefined][];
    previousGroups: GroupWithCount[] | undefined;
    previousCount: number | undefined;
    optId: string;
    groupId: string | null;
  };

  const createBookmarkMutation = useMutation({
    mutationFn: async ({ url, options }: CreateBookmarkVars) => createBookmark(url, options),
    onMutate: async (variables) => {
      if (!userId) return undefined;
      const groupId = variables.options?.groupId ?? null;
      await queryClient.cancelQueries({ queryKey: ["bookmarks", userId] });
      await queryClient.cancelQueries({ queryKey: groupsKey(userId) });
      await queryClient.cancelQueries({ queryKey: bookmarkCountKey(userId) });
      const previousBookmarkEntries = queryClient.getQueriesData<UIBookmark[]>({ queryKey: ["bookmarks", userId] });
      const previousGroups = queryClient.getQueryData<GroupWithCount[]>(groupsKey(userId));
      const previousCount = queryClient.getQueryData<number>(bookmarkCountKey(userId));
      const optId = `${OPT_PREFIX}${Date.now()}`;
      const opt: UIBookmark = {
        ...makeOptimisticBookmark(optId, { url: variables.url, groupId }, groups),
        _clientKey: optId,
        _optimistic: true,
      };
      queryClient.setQueryData(
        bookmarksKey(userId, groupId, sortKey, sortOrder),
        (old: UIBookmark[] | undefined) => [opt, ...(old ?? [])]
      );
      adjustCount(1);
      adjustGroupCount(groupId, 1);
      return { previousBookmarkEntries, previousGroups, previousCount, optId, groupId } as OptimisticContext;
    },
    onError: (_err, _variables, context) => {
      if (!context || !userId) return;
      context.previousBookmarkEntries.forEach(([key, data]) => queryClient.setQueryData(key, data));
      queryClient.setQueryData(groupsKey(userId), context.previousGroups);
      if (typeof context.previousCount === "number") queryClient.setQueryData(bookmarkCountKey(userId), context.previousCount);
    },
    onSuccess: (data, _variables, context) => {
      if (!context || !userId) return;
      queryClient.setQueryData(
        bookmarksKey(userId, context.groupId, sortKey, sortOrder),
        (prev: UIBookmark[] | undefined) =>
          prev?.map((x) => (x.id === context.optId ? { ...data, _clientKey: x._clientKey ?? context.optId } : x)) ?? [data]
      );
    },
  });

  const createNoteMutation = useMutation({
    mutationFn: async ({ content, groupId }: CreateNoteVars) => createNote(content, groupId),
    onMutate: async (variables) => {
      if (!userId) return undefined;
      const groupId = variables.groupId ?? null;
      await queryClient.cancelQueries({ queryKey: ["bookmarks", userId] });
      await queryClient.cancelQueries({ queryKey: groupsKey(userId) });
      await queryClient.cancelQueries({ queryKey: bookmarkCountKey(userId) });
      const previousBookmarkEntries = queryClient.getQueriesData<UIBookmark[]>({ queryKey: ["bookmarks", userId] });
      const previousGroups = queryClient.getQueryData<GroupWithCount[]>(groupsKey(userId));
      const previousCount = queryClient.getQueryData<number>(bookmarkCountKey(userId));
      const optId = `${OPT_PREFIX}note-${Date.now()}`;
      const lines = (variables.content ?? "").split(/\r?\n/);
      const opt: UIBookmark = {
        ...makeOptimisticBookmark(optId, { url: null, title: lines[0]?.slice(0, 500) ?? "Note", groupId }, groups),
        _clientKey: optId,
        _optimistic: true,
      };
      (opt as BookmarkWithGroup & { description?: string | null }).description = variables.content;
      queryClient.setQueryData(
        bookmarksKey(userId, groupId, sortKey, sortOrder),
        (old: UIBookmark[] | undefined) => [opt, ...(old ?? [])]
      );
      adjustCount(1);
      adjustGroupCount(groupId, 1);
      return { previousBookmarkEntries, previousGroups, previousCount, optId, groupId } as OptimisticContext;
    },
    onError: (_err, _variables, context) => {
      if (!context || !userId) return;
      context.previousBookmarkEntries.forEach(([key, data]) => queryClient.setQueryData(key, data));
      queryClient.setQueryData(groupsKey(userId), context.previousGroups);
      if (typeof context.previousCount === "number") queryClient.setQueryData(bookmarkCountKey(userId), context.previousCount);
    },
    onSuccess: (data, _variables, context) => {
      if (!context || !userId) return;
      queryClient.setQueryData(
        bookmarksKey(userId, context.groupId, sortKey, sortOrder),
        (prev: UIBookmark[] | undefined) =>
          prev?.map((x) => (x.id === context.optId ? { ...data, _clientKey: x._clientKey ?? context.optId } : x)) ?? [data]
      );
    },
  });

  const createBookmarkFromMetadataMutation = useMutation({
    mutationFn: async ({ url, metadata, groupId }: CreateFromMetadataVars) => createBookmarkFromMetadata(url, metadata, groupId),
    onMutate: async (variables) => {
      if (!userId) return undefined;
      const groupId = variables.groupId ?? null;
      await queryClient.cancelQueries({ queryKey: ["bookmarks", userId] });
      await queryClient.cancelQueries({ queryKey: groupsKey(userId) });
      await queryClient.cancelQueries({ queryKey: bookmarkCountKey(userId) });
      const previousBookmarkEntries = queryClient.getQueriesData<UIBookmark[]>({ queryKey: ["bookmarks", userId] });
      const previousGroups = queryClient.getQueryData<GroupWithCount[]>(groupsKey(userId));
      const previousCount = queryClient.getQueryData<number>(bookmarkCountKey(userId));
      const optId = `${OPT_PREFIX}${Date.now()}`;
      const opt: UIBookmark = {
        ...makeOptimisticBookmark(optId, { url: variables.url, groupId }, groups),
        _clientKey: optId,
        _optimistic: true,
      };
      queryClient.setQueryData(
        bookmarksKey(userId, groupId, sortKey, sortOrder),
        (old: UIBookmark[] | undefined) => [opt, ...(old ?? [])]
      );
      adjustCount(1);
      adjustGroupCount(groupId, 1);
      return { previousBookmarkEntries, previousGroups, previousCount, optId, groupId } as OptimisticContext;
    },
    onError: (_err, _variables, context) => {
      if (!context || !userId) return;
      context.previousBookmarkEntries.forEach(([key, data]) => queryClient.setQueryData(key, data));
      queryClient.setQueryData(groupsKey(userId), context.previousGroups);
      if (typeof context.previousCount === "number") queryClient.setQueryData(bookmarkCountKey(userId), context.previousCount);
    },
    onSuccess: (data, _variables, context) => {
      if (!context || !userId) return;
      queryClient.setQueryData(
        bookmarksKey(userId, context.groupId, sortKey, sortOrder),
        (prev: UIBookmark[] | undefined) =>
          prev?.map((x) => (x.id === context.optId ? { ...data, _clientKey: x._clientKey ?? context.optId } : x)) ?? [data]
      );
    },
  });

  const handleBookmarkUpdate = useCallback(
    async (
      id: string,
      patch: Partial<Pick<BookmarkWithGroup, "title" | "description" | "url" | "groupId">>
    ) => {
      if (!userId) return;

      const previousLists = queryClient.getQueriesData<UIBookmark[]>({
        queryKey: ["bookmarks", userId],
      });
      const previousGroups = queryClient.getQueryData<GroupWithCount[]>(groupsKey(userId));
      const previousCount = queryClient.getQueryData<number>(bookmarkCountKey(userId));
      const current = previousLists
        .flatMap(([, list]) => list ?? [])
        .find((bookmark) => bookmark.id === id);
      const prevGroupId = current?.groupId ?? null;
      const nextGroupId = patch.groupId === undefined ? prevGroupId : patch.groupId;

      queryClient.setQueriesData<UIBookmark[]>(
        { queryKey: ["bookmarks", userId] },
        (old) =>
          old?.map((bookmark) =>
            bookmark.id !== id
              ? bookmark
              : {
                  ...bookmark,
                  ...patch,
                  group:
                    patch.groupId === undefined
                      ? bookmark.group
                      : patch.groupId
                        ? groups.find((g) => g.id === patch.groupId) ?? null
                        : null,
                }
          ) ?? old
      );
      if (prevGroupId !== nextGroupId) {
        adjustGroupCount(prevGroupId, -1);
        adjustGroupCount(nextGroupId, 1);
      }

      try {
        await updateBookmark(id, patch);
      } catch (error) {
        for (const [key, data] of previousLists) {
          queryClient.setQueryData(key, data);
        }
        queryClient.setQueryData(groupsKey(userId), previousGroups);
        queryClient.setQueryData(bookmarkCountKey(userId), previousCount);
        throw error;
      }
    },
    [adjustGroupCount, groups, queryClient, userId]
  );

  const handleBookmarkDelete = useCallback(
    async (id: string) => {
      if (!userId) return;

      const previousLists = queryClient.getQueriesData<UIBookmark[]>({
        queryKey: ["bookmarks", userId],
      });
      const previousGroups = queryClient.getQueryData<GroupWithCount[]>(groupsKey(userId));
      const previousCount = queryClient.getQueryData<number>(bookmarkCountKey(userId));
      const deleted = previousLists.flatMap(([, list]) => list ?? []).find((bookmark) => bookmark.id === id);

      queryClient.setQueriesData<UIBookmark[]>(
        { queryKey: ["bookmarks", userId] },
        (old) => old?.filter((bookmark) => bookmark.id !== id) ?? old
      );

      if (deleted) {
        adjustCount(-1);
        adjustGroupCount(deleted.groupId, -1);
      }

      try {
        await deleteBookmark(id);
      } catch (error) {
        for (const [key, data] of previousLists) {
          queryClient.setQueryData(key, data);
        }
        queryClient.setQueryData(groupsKey(userId), previousGroups);
        if (typeof previousCount === "number") {
          queryClient.setQueryData(bookmarkCountKey(userId), previousCount);
        }
        throw error;
      }
    },
    [adjustCount, adjustGroupCount, queryClient, userId]
  );

  const allDisplayedSelected = useMemo(() => {
    if (displayedBookmarks.length === 0) return false;
    return displayedBookmarks.every((bookmark) => selectedIds.has(bookmark.id));
  }, [displayedBookmarks, selectedIds]);

  const selectAll = useCallback(() => {
    if (displayedBookmarks.length === 0) return;

    setSelectedIds((prev) => {
      const allSelected = displayedBookmarks.every((bookmark) => prev.has(bookmark.id));
      if (allSelected) return new Set();
      return new Set(displayedBookmarks.map((bookmark) => bookmark.id));
    });
  }, [displayedBookmarks]);

  const handleMoveConfirm = useCallback(
    async (groupId: string | null) => {
      const ids = Array.from(selectedIds);
      for (const id of ids) {
        await handleBookmarkUpdate(id, { groupId });
      }
      clearSelection();
      setMoveDialogOpen(false);
      if (ids.length) toast.success(`Moved ${ids.length} bookmark${ids.length === 1 ? "" : "s"}`);
    },
    [selectedIds, handleBookmarkUpdate, clearSelection]
  );

  const handleBulkCopyUrls = useCallback(async () => {
    const selected = displayedBookmarks.filter((b) => selectedIds.has(b.id));
    const lines = selected.map((b) => (b.url?.trim() ? b.url : [b.title, b.description].filter(Boolean).join("\n")));
    const text = lines.join("\n");
    if (text) {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    }
  }, [displayedBookmarks, selectedIds]);

  const handleBulkExport = useCallback(
    (format: "csv" | "json") => {
      const selected = displayedBookmarks.filter((b) => selectedIds.has(b.id));
      const rows = selected.map((b) => ({
        title: b.title ?? "",
        url: b.url ?? "",
        description: b.description ?? "",
        group: b.group?.name ?? "",
        createdAt: b.createdAt,
      }));
      if (format === "json") {
        const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "bookmarks.json";
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const header = "title,url,description,group,createdAt";
        const escape = (s: string) => {
          const t = String(s ?? "").replace(/"/g, '""');
          return t.includes(",") || t.includes('"') || t.includes("\n") ? `"${t}"` : t;
        };
        const body = rows.map((r) => [r.title, r.url, r.description, r.group, String(r.createdAt)].map(escape).join(",")).join("\n");
        const blob = new Blob([header + "\n" + body], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "bookmarks.csv";
        a.click();
        URL.revokeObjectURL(url);
      }
      toast.success(`Exported as ${format.toUpperCase()}`);
    },
    [displayedBookmarks, selectedIds]
  );

  const requestBulkDelete = useCallback(() => {
    if (selectedIds.size === 0) return;
    setBulkDeleteConfirmOpen(true);
  }, [selectedIds]);

  const confirmBulkDelete = useCallback(async () => {
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      await handleBookmarkDelete(id);
    }
    setBulkDeleteConfirmOpen(false);
    clearSelection();
    if (ids.length) toast.success(`Deleted ${ids.length} bookmark${ids.length === 1 ? "" : "s"}`);
  }, [selectedIds, handleBookmarkDelete, clearSelection]);

  const handleBookmarkRefresh = useCallback(
    async (id: string) => {
      if (!userId) return;
      try {
        await refreshBookmark(id);
        toast.success("Bookmark refreshed");
      } catch {
        toast.error("Failed to refresh");
      }
    },
    [userId]
  );

  const handleSelectGroupId = useCallback(
    (id: string | null) => {
      try {
        if (typeof window !== "undefined") {
          if (id) localStorage.setItem(LAST_GROUP_KEY, id);
          else localStorage.removeItem(LAST_GROUP_KEY);
        }
      } catch {
      }
      setGroupParam(id);
    },
    [setGroupParam]
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const inInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA";
      const inDialog = !!target.closest("[role='dialog']");
      const selectedIndex =
        focusedIndex >= 0 && displayedBookmarks.length > 0
          ? Math.min(focusedIndex, displayedBookmarks.length - 1)
          : -1;
      const selectedBookmark =
        selectedIndex >= 0 ? displayedBookmarks[selectedIndex] : null;
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        setSearchMode((m) => !m);
        setSearchQuery("");
        setInputValue("");
      }
      if (e.key === "?" && !e.ctrlKey && !e.metaKey && !e.altKey && !inInput && !inDialog) {
        e.preventDefault();
        setShowShortcuts((s) => !s);
      }
      if (!inInput && !inDialog && displayedBookmarks.length > 0) {
        if (e.key === "ArrowDown" || e.key === "j") {
          e.preventDefault();
          setFocusedIndex((i) => Math.min(i >= 0 ? i + 1 : 0, displayedBookmarks.length - 1));
          return;
        }
        if (e.key === "ArrowUp" || e.key === "k") {
          e.preventDefault();
          setFocusedIndex((i) => Math.max(0, (i >= 0 ? i : 0) - 1));
          return;
        }
      }
      if (!inInput && !inDialog && selectedBookmark) {
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
          e.preventDefault();
          if (selectedBookmark.url) {
            window.open(selectedBookmark.url, "_blank", "noopener,noreferrer");
          }
          return;
        }
        if (!e.ctrlKey && !e.metaKey && e.key === "Enter") {
          e.preventDefault();
          const text = selectedBookmark.url
            ? selectedBookmark.url
            : [selectedBookmark.title, selectedBookmark.description]
                .filter(Boolean)
                .join("\n");
          if (text) void navigator.clipboard.writeText(text);
          return;
        }
        if (!e.ctrlKey && !e.metaKey && (e.key === " " || e.code === "Space")) {
          e.preventDefault();
          setPreviewBookmark(selectedBookmark);
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [displayedBookmarks, focusedIndex]);

  const handleHeroSubmit = useCallback(async () => {
    if (searchMode) return;
    const raw = inputValue.trim();
    if (!raw) return;
    setInputValue("");
    const defaultGroupId = selectedGroupId;
    if (raw.startsWith("http://") || raw.startsWith("https://")) {
      await createBookmarkMutation.mutateAsync({ url: raw, options: { groupId: defaultGroupId } });
      return;
    }
    const urls = await parseTextForUrls(raw);
    if (urls.length > 0) {
      for (const url of urls) {
        try {
          const meta = await unfurlUrl(url);
          await createBookmarkFromMetadataMutation.mutateAsync({
            url,
            metadata: {
              title: meta.title,
              description: meta.description,
              faviconUrl: meta.faviconUrl,
              previewImageUrl: meta.previewImageUrl,
            },
            groupId: defaultGroupId,
          });
        } catch {
        }
      }
      return;
    }
    await createNoteMutation.mutateAsync({ content: raw, groupId: defaultGroupId });
  }, [
    inputValue,
    searchMode,
    selectedGroupId,
    createBookmarkMutation,
    createNoteMutation,
    createBookmarkFromMetadataMutation,
  ]);

  const handleHeroPaste = useCallback(
    async (text: string, files: FileList | null) => {
      if (files?.length) {
        const file = files[0];
        const mime = file.type;
        if (!mime.startsWith("image/")) return;
        setIsSubmitting(true);
        try {
          const base64 = await new Promise<string>((res, rej) => {
            const r = new FileReader();
            r.onload = () => {
              const dataUrl = r.result as string;
              const base = dataUrl.indexOf(",");
              res(base >= 0 ? dataUrl.slice(base + 1) : "");
            };
            r.onerror = rej;
            r.readAsDataURL(file);
          });
          const urls = await parseImageForUrls(base64, mime);
          const defaultGroupId = selectedGroupId;
          const created: BookmarkWithGroup[] = [];
          for (const url of urls) {
            try {
              const meta = await unfurlUrl(url);
              const b = await createBookmarkFromMetadataMutation.mutateAsync({
                url,
                metadata: {
                  title: meta.title,
                  description: meta.description,
                  faviconUrl: meta.faviconUrl,
                  previewImageUrl: meta.previewImageUrl,
                },
                groupId: defaultGroupId,
              });
              created.push(b);
            } catch {
            }
          }
          if (created.length) {
            queryClient.invalidateQueries({ queryKey: userId ? ["bookmarks", userId] : ["bookmarks", "anon"] });
            refreshGroups();
          }
        } catch {
        } finally {
          setIsSubmitting(false);
        }
        return;
      }
      if (text?.trim()) {
        setInputValue((v) => (v ? v + "\n" + text : text));
      }
    },
    [selectedGroupId, userId, queryClient, createBookmarkFromMetadataMutation, refreshGroups]
  );

  const clampedFocus =
    displayedBookmarks.length === 0
      ? -1
      : focusedIndex < 0
        ? -1
        : Math.min(focusedIndex, displayedBookmarks.length - 1);

  return {
    groups,
    totalBookmarkCount,
    selectedGroupId,
    handleSelectGroupId,
    refreshGroups,
    searchMode,
    searchQuery,
    inputValue,
    setInputValue,
    setSearchQuery,
    displayedBookmarks,
    handleHeroSubmit,
    handleHeroPaste,
    handleBookmarkUpdate,
    handleBookmarkDelete,
    handleBookmarkRefresh,
    previewBookmark,
    setPreviewBookmark,
    showShortcuts,
    setShowShortcuts,
    isSubmitting,
    isTransitionLoading,
    focusedIndex: clampedFocus,
    setFocusedIndex,
    selectionMode,
    setSelectionMode,
    selectedIds,
    toggleSelection,
    enterSelectionWithBookmark,
    allDisplayedSelected,
    selectAll,
    clearSelection,
    moveDialogOpen,
    setMoveDialogOpen,
    handleBulkMove,
    handleMoveConfirm,
    handleBulkCopyUrls,
    handleBulkExport,
    bulkDeleteConfirmOpen,
    setBulkDeleteConfirmOpen,
    requestBulkDelete,
    confirmBulkDelete,
  };
}
