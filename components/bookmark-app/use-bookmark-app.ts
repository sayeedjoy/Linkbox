"use client";

import { useCallback, useEffect, useMemo, useState, useDeferredValue } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { BookmarkWithGroup } from "@/app/actions/bookmarks";
import type { GroupWithCount } from "@/lib/types";
import { getBookmarks, getTotalBookmarkCount, createBookmark, createNote, createBookmarkFromMetadata, updateBookmark, deleteBookmark } from "@/app/actions/bookmarks";
import { getGroups } from "@/app/actions/groups";
import { parseTextForUrls, parseImageForUrls, unfurlUrl } from "@/app/actions/parse";
import { filterBookmarks, makeOptimisticBookmark } from "./utils";
import { groupsKey, bookmarksKey, bookmarkCountKey } from "@/lib/query-keys";

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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const userId = session?.user?.id ?? null;

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(
    initialSelectedGroupId ?? null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState(false);
  const [sortKey, setSortKey] = useState<"createdAt" | "title">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [inputValue, setInputValue] = useState("");
  const [previewBookmark, setPreviewBookmark] = useState<BookmarkWithGroup | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const groupsQuery = useQuery({
    queryKey: userId ? groupsKey(userId) : ["groups", "anon"],
    queryFn: () => getGroups(),
    enabled: !!userId,
    initialData: !userId ? initialGroups : undefined,
    staleTime: 5 * 1000,
  });
  const groups = useMemo(() => groupsQuery.data ?? initialGroups, [groupsQuery.data, initialGroups]);

  const bookmarksQuery = useQuery({
    queryKey: userId ? bookmarksKey(userId, selectedGroupId, sortKey, sortOrder) : ["bookmarks", "anon"],
    queryFn: () =>
      getBookmarks({
        groupId: selectedGroupId,
        sort: sortKey,
        order: sortOrder,
      }),
    enabled: !!userId,
    initialData: !userId ? initialBookmarks : undefined,
    staleTime: 5 * 1000,
  });
  const bookmarks = useMemo(
    () => bookmarksQuery.data ?? initialBookmarks,
    [bookmarksQuery.data, initialBookmarks]
  );

  const countQuery = useQuery({
    queryKey: userId ? bookmarkCountKey(userId) : ["bookmark-count", "anon"],
    queryFn: () => getTotalBookmarkCount(),
    enabled: !!userId,
    initialData: !userId ? initialTotalBookmarkCount : undefined,
    staleTime: 5 * 1000,
  });
  const totalBookmarkCount = countQuery.data ?? initialTotalBookmarkCount;

  const displayedBookmarks = useMemo(
    () => (searchMode ? filterBookmarks(bookmarks, deferredSearchQuery) : bookmarks),
    [searchMode, bookmarks, deferredSearchQuery]
  );

  const invalidateBookmarkCaches = useCallback(() => {
    if (!userId) return;
    queryClient.invalidateQueries({ queryKey: groupsKey(userId), refetchType: "none" });
    queryClient.invalidateQueries({ queryKey: ["bookmarks", userId], refetchType: "none" });
    queryClient.invalidateQueries({ queryKey: bookmarkCountKey(userId), refetchType: "none" });
  }, [queryClient, userId]);

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

  const createBookmarkMutation = useMutation({
    mutationFn: async ({
      url,
      options,
    }: {
      url: string;
      options?: { groupId?: string | null; title?: string; description?: string };
    }) => createBookmark(url, options),
    onSettled: invalidateBookmarkCaches,
  });

  const createNoteMutation = useMutation({
    mutationFn: async ({
      content,
      groupId,
    }: {
      content: string;
      groupId?: string | null;
    }) => createNote(content, groupId),
    onSettled: invalidateBookmarkCaches,
  });

  const createBookmarkFromMetadataMutation = useMutation({
    mutationFn: async ({
      url,
      metadata,
      groupId,
    }: {
      url: string;
      metadata: {
        title?: string | null;
        description?: string | null;
        faviconUrl?: string | null;
        previewImageUrl?: string | null;
      };
      groupId?: string | null;
    }) => createBookmarkFromMetadata(url, metadata, groupId),
    onSettled: invalidateBookmarkCaches,
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
      } finally {
        invalidateBookmarkCaches();
      }
    },
    [adjustGroupCount, groups, invalidateBookmarkCaches, queryClient, userId]
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
      } finally {
        invalidateBookmarkCaches();
      }
    },
    [adjustCount, adjustGroupCount, invalidateBookmarkCaches, queryClient, userId]
  );

  useEffect(() => {
    const groupInUrl = searchParams.get("group");
    if (groupInUrl != null && groupInUrl !== "") {
      if (initialSelectedGroupId === null) router.replace("/");
      return;
    }
    try {
      const last = typeof window !== "undefined" ? localStorage.getItem(LAST_GROUP_KEY) : null;
      if (last) router.replace(`/?group=${encodeURIComponent(last)}`);
    } catch {
    }
  }, [searchParams, router, initialSelectedGroupId]);

  const handleSelectGroupId = useCallback(
    (id: string | null) => {
      setSelectedGroupId(id);
      try {
        if (typeof window !== "undefined") {
          if (id) localStorage.setItem(LAST_GROUP_KEY, id);
          else localStorage.removeItem(LAST_GROUP_KEY);
        }
      } catch {
      }
      const params = new URLSearchParams(searchParams.toString());
      if (id) {
        params.set("group", id);
      } else {
        params.delete("group");
      }
      const query = params.toString();
      const targetUrl = query ? `${pathname}?${query}` : pathname;
      setTimeout(() => router.replace(targetUrl), 0);
    },
    [router, pathname, searchParams]
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
      const optId = `${OPT_PREFIX}${Date.now()}`;
      const opt: UIBookmark = {
        ...makeOptimisticBookmark(optId, { url: raw, groupId: defaultGroupId }, groups),
        _clientKey: optId,
        _optimistic: true,
      };
      queryClient.setQueryData(
        userId ? bookmarksKey(userId, defaultGroupId, sortKey, sortOrder) : ["bookmarks", "anon"],
        (old: UIBookmark[] | undefined) => [opt, ...(old ?? [])]
      );
      adjustCount(1);
      adjustGroupCount(defaultGroupId, 1);
      try {
        const b = await createBookmarkMutation.mutateAsync({
          url: raw,
          options: { groupId: defaultGroupId },
        });
        queryClient.setQueryData(
          userId ? bookmarksKey(userId, defaultGroupId, sortKey, sortOrder) : ["bookmarks", "anon"],
          (prev: UIBookmark[] | undefined) =>
            prev
              ? prev.map((x) =>
                  x.id === optId
                    ? { ...b, _clientKey: x._clientKey ?? optId }
                    : x
                )
              : [{ ...b, _clientKey: optId }]
        );
      } catch {
        adjustCount(-1);
        adjustGroupCount(defaultGroupId, -1);
        queryClient.setQueryData(
          userId ? bookmarksKey(userId, defaultGroupId, sortKey, sortOrder) : ["bookmarks", "anon"],
          (prev: UIBookmark[] | undefined) => prev?.filter((x) => x.id !== optId) ?? []
        );
      }
      return;
    }
    const urls = await parseTextForUrls(raw);
    if (urls.length > 0) {
      const optIds = urls.map((_, i) => `${OPT_PREFIX}${Date.now()}-${i}`);
      const optimistic = optIds.map((id, i) =>
        makeOptimisticBookmark(id, { url: urls[i], groupId: defaultGroupId }, groups)
      );
      queryClient.setQueryData(
        userId ? bookmarksKey(userId, defaultGroupId, sortKey, sortOrder) : ["bookmarks", "anon"],
        (old: UIBookmark[] | undefined) => [
          ...optimistic.map((bookmark, idx) => ({
            ...bookmark,
            _clientKey: optIds[idx],
            _optimistic: true,
          })),
          ...(old ?? []),
        ]
      );
      if (optimistic.length > 0) {
        adjustCount(optimistic.length);
        adjustGroupCount(defaultGroupId, optimistic.length);
      }
      const created: BookmarkWithGroup[] = [];
      let failed = 0;
      for (let i = 0; i < urls.length; i++) {
        try {
          const meta = await unfurlUrl(urls[i]);
          const b = await createBookmarkFromMetadataMutation.mutateAsync({
            url: urls[i],
            metadata: {
              title: meta.title,
              description: meta.description,
              faviconUrl: meta.faviconUrl,
              previewImageUrl: meta.previewImageUrl,
            },
            groupId: defaultGroupId,
          });
          created.push(b);
          queryClient.setQueryData(
            userId ? bookmarksKey(userId, defaultGroupId, sortKey, sortOrder) : ["bookmarks", "anon"],
            (prev: UIBookmark[] | undefined) =>
              prev
                ? prev.map((x) => (x.id === optIds[i] ? { ...b, _clientKey: x._clientKey ?? optIds[i] } : x))
                : [{ ...b, _clientKey: optIds[i] }]
          );
        } catch {
          failed++;
          adjustCount(-1);
          adjustGroupCount(defaultGroupId, -1);
          queryClient.setQueryData(
            userId ? bookmarksKey(userId, defaultGroupId, sortKey, sortOrder) : ["bookmarks", "anon"],
            (prev: UIBookmark[] | undefined) => prev?.filter((x) => x.id !== optIds[i]) ?? []
          );
        }
      }
      return;
    }
    const optId = `${OPT_PREFIX}note-${Date.now()}`;
    const lines = raw.split(/\r?\n/);
    const opt: UIBookmark = {
      ...makeOptimisticBookmark(
        optId,
        { url: null, title: lines[0]?.slice(0, 500) ?? "Note", groupId: defaultGroupId },
        groups
      ),
      _clientKey: optId,
      _optimistic: true,
    };
    opt.description = raw;
    queryClient.setQueryData(
      userId ? bookmarksKey(userId, defaultGroupId, sortKey, sortOrder) : ["bookmarks", "anon"],
      (old: UIBookmark[] | undefined) => [opt, ...(old ?? [])]
    );
    adjustCount(1);
    adjustGroupCount(defaultGroupId, 1);
    try {
      const note = await createNoteMutation.mutateAsync({
        content: raw,
        groupId: defaultGroupId,
      });
      queryClient.setQueryData(
        userId ? bookmarksKey(userId, defaultGroupId, sortKey, sortOrder) : ["bookmarks", "anon"],
        (prev: UIBookmark[] | undefined) =>
          prev
            ? prev.map((x) =>
                x.id === optId ? { ...note, _clientKey: x._clientKey ?? optId } : x
              )
            : [{ ...note, _clientKey: optId }]
      );
    } catch {
      adjustCount(-1);
      adjustGroupCount(defaultGroupId, -1);
      queryClient.setQueryData(
        userId ? bookmarksKey(userId, defaultGroupId, sortKey, sortOrder) : ["bookmarks", "anon"],
        (prev: UIBookmark[] | undefined) => prev?.filter((x) => x.id !== optId) ?? []
      );
    }
  }, [
    inputValue,
    searchMode,
    selectedGroupId,
    groups,
    userId,
    sortKey,
    sortOrder,
    queryClient,
    adjustCount,
    adjustGroupCount,
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
    sortKey,
    sortOrder,
    setSortKey,
    setSortOrder,
    handleHeroSubmit,
    handleHeroPaste,
    handleBookmarkUpdate,
    handleBookmarkDelete,
    previewBookmark,
    setPreviewBookmark,
    showShortcuts,
    setShowShortcuts,
    isSubmitting,
    focusedIndex: clampedFocus,
    setFocusedIndex,
  };
}
