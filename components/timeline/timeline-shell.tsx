"use client";

import { useState, useCallback, useMemo, useRef, useDeferredValue } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Timeline } from "./timeline";
import { TimelineFilters } from "./timeline-filters";
import { TimelineEditDialog } from "./timeline-edit-dialog";
import { bookmarkWithGroupToTimeline } from "./types";
import type { GroupWithCount } from "@/lib/types";
import type { BookmarkWithGroup } from "@/app/actions/bookmarks";
import { refreshBookmark, deleteBookmark, getBookmarks } from "@/app/actions/bookmarks";
import { getGroups } from "@/app/actions/groups";
import { timelineBookmarksKey, groupsKey } from "@/lib/query-keys";
import { useFocusRefetch } from "@/hooks/use-focus-refetch";

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
  const deferredSearch = useDeferredValue(search);
  const normalizedSearch = deferredSearch.trim().toLowerCase();

  const shouldUseInitialBookmarks = initialBookmarks.length > 0 && !!userId;

  const bookmarksQuery = useQuery({
    queryKey: userId ? timelineBookmarksKey(userId) : ["bookmarks", "timeline", "anon"],
    queryFn: () =>
      getBookmarks({ sort: "createdAt", order: "desc" }),
    enabled: !!userId,
    initialData: shouldUseInitialBookmarks ? initialBookmarks : undefined,
    initialDataUpdatedAt: shouldUseInitialBookmarks && mountedAt ? mountedAt : undefined,
    placeholderData: (previousData) => previousData,
  });

  const groupsQuery = useQuery({
    queryKey: userId ? groupsKey(userId) : ["groups", "anon"],
    queryFn: () => getGroups(),
    enabled: !!userId,
    initialData: initialGroups.length > 0 ? initialGroups : undefined,
    initialDataUpdatedAt: initialGroups.length > 0 && mountedAt ? mountedAt : undefined,
  });

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
    const filtered =
      normalizedSearch.length > 0
        ? preparedBookmarks.filter((entry) => entry.searchBlob.includes(normalizedSearch))
        : preparedBookmarks;

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === "name-asc") {
        return titleCollator.compare(a.titleForSort, b.titleForSort);
      }
      return b.createdAtMs - a.createdAtMs;
    });

    return sorted.map((entry) => bookmarkWithGroupToTimeline(entry.bookmark));
  }, [normalizedSearch, preparedBookmarks, sortBy]);
  const groups = useMemo(
    () => groupsQuery.data ?? initialGroups,
    [groupsQuery.data, initialGroups]
  );

  useFocusRefetch(userId);

  const invalidateTimeline = useCallback(() => {
    if (!userId) return;
    queryClient.invalidateQueries({ queryKey: ["bookmarks", userId] });
    queryClient.invalidateQueries({ queryKey: groupsKey(userId) });
  }, [queryClient, userId]);

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

  return (
    <>
      <TimelineFilters
        className="mb-6"
        search={search}
        onSearchChange={setSearch}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />
      <Timeline
        bookmarks={bookmarks}
        onEdit={setEditBookmarkId}
        onRefresh={handleRefresh}
        onDelete={handleDelete}
      />
      <TimelineEditDialog
        bookmark={editBookmark}
        groups={groups}
        open={!!editBookmarkId}
        onOpenChange={(open) => !open && setEditBookmarkId(null)}
        onSaved={invalidateTimeline}
      />
    </>
  );
}
