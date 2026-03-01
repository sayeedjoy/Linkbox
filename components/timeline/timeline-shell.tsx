"use client";

import { useState, useCallback, useEffect, useMemo, useRef, useDeferredValue } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AnimatePresence } from "motion/react";
import { Timeline } from "./timeline";
import { TimelineFilters } from "./timeline-filters";
import { TimelineEditDialog } from "./timeline-edit-dialog";
import { ProfileHeader } from "@/components/profile-header";
import { MultiSelectToolbar } from "@/components/multi-select";
import { MoveToGroupDialog } from "@/components/move-to-group-dialog";
import { bookmarkWithGroupToTimeline } from "./types";
import type { GroupWithCount } from "@/lib/types";
import type { BookmarkWithGroup } from "@/app/actions/bookmarks";
import { refreshBookmark, deleteBookmark, getBookmarks, createBookmark, updateBookmark } from "@/app/actions/bookmarks";
import { getGroups } from "@/app/actions/groups";
import { timelineBookmarksKey, groupsKey, bookmarkCountKey } from "@/lib/query-keys";
import type { RealtimeEvent } from "@/lib/realtime";

type TimelineSort = "date-desc" | "name-asc";

const titleCollator = new Intl.Collator("en", {
  sensitivity: "base",
  numeric: true,
});

function toSearchBlob(bookmark: BookmarkWithGroup): string {
  return [
    bookmark.title ?? "",
    bookmark.url ?? "",
    bookmark.description ?? "",
    bookmark.group?.name ?? "",
  ]
    .join("\n")
    .toLowerCase();
}

function getTitleForSort(bookmark: BookmarkWithGroup): string {
  return (bookmark.title ?? bookmark.url ?? "").trim();
}

export function TimelineShell({
  initialBookmarks,
  initialGroups,
}: {
  initialBookmarks: BookmarkWithGroup[];
  initialGroups: GroupWithCount[];
}) {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const userId = session?.user?.id ?? null;

  const mountedAtRef = useRef<number>(0);
  if (mountedAtRef.current === 0 && typeof window !== "undefined") {
    mountedAtRef.current = Date.now();
  }
  const mountedAt = mountedAtRef.current;

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<TimelineSort>("date-desc");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [searchMode, setSearchMode] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const deferredSearch = useDeferredValue(search);
  const normalizedSearch = deferredSearch.trim().toLowerCase();

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
  }, []);

  const handleBulkMove = useCallback(() => setMoveDialogOpen(true), []);

  const shouldUseInitialBookmarks = initialBookmarks.length > 0 && !!userId;

  const bookmarksQuery = useQuery({
    queryKey: userId ? timelineBookmarksKey(userId) : ["bookmarks", "timeline", "anon"],
    queryFn: () =>
      getBookmarks({ sort: "createdAt", order: "desc" }),
    enabled: !!userId,
    initialData: shouldUseInitialBookmarks ? initialBookmarks : undefined,
    initialDataUpdatedAt: shouldUseInitialBookmarks && mountedAt ? mountedAt : undefined,
    placeholderData: (previousData) => previousData,
    refetchOnWindowFocus: false,
  });

  const groupsQuery = useQuery({
    queryKey: userId ? groupsKey(userId) : ["groups", "anon"],
    queryFn: () => getGroups(),
    enabled: !!userId,
    initialData: initialGroups.length > 0 ? initialGroups : undefined,
    initialDataUpdatedAt: initialGroups.length > 0 && mountedAt ? mountedAt : undefined,
    refetchOnWindowFocus: false,
  });

  /* ── Realtime SSE – mirrors the dashboard EventSource pattern ── */
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

  const bookmarksRaw = useMemo(
    () => bookmarksQuery.data ?? (shouldUseInitialBookmarks ? initialBookmarks : []),
    [bookmarksQuery.data, initialBookmarks, shouldUseInitialBookmarks]
  );
  const preparedBookmarks = useMemo(
    () =>
      bookmarksRaw.map((bookmark) => ({
        bookmark,
        searchBlob: toSearchBlob(bookmark),
        titleForSort: getTitleForSort(bookmark),
        createdAtMs: new Date(bookmark.createdAt).getTime(),
      })),
    [bookmarksRaw]
  );

  const bookmarks = useMemo(() => {
    const groupFiltered =
      selectedGroupId === null
        ? preparedBookmarks
        : preparedBookmarks.filter((entry) => entry.bookmark.groupId === selectedGroupId);

    const filtered =
      normalizedSearch.length > 0
        ? groupFiltered.filter((entry) => entry.searchBlob.includes(normalizedSearch))
        : groupFiltered;

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === "name-asc") {
        return titleCollator.compare(a.titleForSort, b.titleForSort);
      }
      return b.createdAtMs - a.createdAtMs;
    });

    return sorted.map((entry) => bookmarkWithGroupToTimeline(entry.bookmark));
  }, [normalizedSearch, preparedBookmarks, selectedGroupId, sortBy]);
  const groups = useMemo(
    () => groupsQuery.data ?? initialGroups,
    [groupsQuery.data, initialGroups]
  );
  const totalBookmarkCount = bookmarksRaw.length;

  const invalidateTimeline = useCallback(() => {
    if (!userId) return;
    queryClient.invalidateQueries({ queryKey: ["bookmarks", userId] });
    queryClient.invalidateQueries({ queryKey: groupsKey(userId) });
  }, [queryClient, userId]);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(bookmarks.map((b) => b.id)));
  }, [bookmarks]);

  const handleMoveConfirm = useCallback(
    async (groupId: string | null) => {
      const ids = Array.from(selectedIds);
      for (const id of ids) {
        await updateBookmark(id, { groupId });
      }
      invalidateTimeline();
      clearSelection();
      setMoveDialogOpen(false);
      if (ids.length) toast.success(`Moved ${ids.length} bookmark${ids.length === 1 ? "" : "s"}`);
    },
    [selectedIds, invalidateTimeline, clearSelection]
  );

  const handleBulkCopyUrls = useCallback(async () => {
    const selected = bookmarks.filter((b) => selectedIds.has(b.id));
    const lines = selected.map((b) => (b.url?.trim() ? b.url : [b.title, b.description].filter(Boolean).join("\n")));
    const text = lines.join("\n");
    if (text) {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    }
  }, [bookmarks, selectedIds]);

  const handleBulkExport = useCallback(
    (format: "csv" | "json") => {
      const selected = bookmarks.filter((b) => selectedIds.has(b.id));
      const rows = selected.map((b) => ({
        title: b.title ?? "",
        url: b.url ?? "",
        description: b.description ?? "",
        group: b.category ?? "",
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
    [bookmarks, selectedIds]
  );

  const handleBulkDelete = useCallback(async () => {
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      await deleteBookmark(id);
      invalidateTimeline();
    }
    clearSelection();
    if (ids.length) toast.success(`Deleted ${ids.length} bookmark${ids.length === 1 ? "" : "s"}`);
  }, [selectedIds, invalidateTimeline, clearSelection]);

  const [editBookmarkId, setEditBookmarkId] = useState<string | null>(null);
  const editBookmark = editBookmarkId
    ? bookmarks.find((b) => b.id === editBookmarkId) ?? null
    : null;

  const handleRefresh = useCallback(
    async (id: string) => {
      try {
        await refreshBookmark(id);
        invalidateTimeline();
        toast.success("Bookmark refreshed");
      } catch {
        toast.error("Failed to refresh");
      }
    },
    [invalidateTimeline]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteBookmark(id);
        invalidateTimeline();
        toast.success("Bookmark deleted");
      } catch {
        toast.error("Failed to delete");
      }
    },
    [invalidateTimeline]
  );

  const handleHeroSubmit = useCallback(async () => {
    if (searchMode) return;
    const raw = inputValue.trim();
    if (!raw) return;
    setInputValue("");
    try {
      await createBookmark(raw);
      invalidateTimeline();
      toast.success("Bookmark added");
    } catch {
      toast.error("Failed to add bookmark");
    }
  }, [inputValue, searchMode, invalidateTimeline]);

  const handleHeroPaste = useCallback(
    async (text: string, files: FileList | null) => {
      if (files?.length) return;
      if (text?.trim()) {
        setInputValue((v) => (v ? v + "\n" + text : text));
      }
    },
    []
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <ProfileHeader
        groups={groups}
        totalBookmarkCount={totalBookmarkCount}
        selectedGroupId={selectedGroupId}
        onSelectGroupId={setSelectedGroupId}
        onGroupsChange={invalidateTimeline}
      />
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-4 sm:px-6 sm:py-6 pb-[max(1rem,env(safe-area-inset-bottom))] flex flex-col gap-6">
        <TimelineFilters
          inputValue={inputValue}
          onInputChange={setInputValue}
          onSubmit={handleHeroSubmit}
          onPaste={handleHeroPaste}
          searchMode={searchMode}
          onSearchModeChange={setSearchMode}
          search={search}
          onSearchChange={setSearch}
        />
        <Timeline
          bookmarks={bookmarks}
          onEdit={setEditBookmarkId}
          onRefresh={handleRefresh}
          onDelete={handleDelete}
          sortBy={sortBy}
          onSortChange={setSortBy}
          selectionMode={selectionMode}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelection}
          onSelectClick={() => setSelectionMode(true)}
        />
      </main>
      <AnimatePresence>
        {selectionMode && selectedIds.size > 0 && (
          <MultiSelectToolbar
            selectedCount={selectedIds.size}
            onSelectAll={selectAll}
            onMove={handleBulkMove}
            onCopyUrls={handleBulkCopyUrls}
            onExport={handleBulkExport}
            onDelete={handleBulkDelete}
            onClose={clearSelection}
            hasUsername={false}
          />
        )}
      </AnimatePresence>
      <MoveToGroupDialog
        open={moveDialogOpen}
        onOpenChange={setMoveDialogOpen}
        groups={groups}
        onConfirm={handleMoveConfirm}
      />
      <TimelineEditDialog
        bookmark={editBookmark}
        groups={groups}
        open={!!editBookmarkId}
        onOpenChange={(open) => !open && setEditBookmarkId(null)}
        onSaved={invalidateTimeline}
        onGroupsChange={invalidateTimeline}
      />
    </div>
  );
}
