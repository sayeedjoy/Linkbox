"use client";

import { useCallback, useEffect, useMemo, useState, useDeferredValue } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { BookmarkWithGroup } from "@/app/actions/bookmarks";
import type { GroupWithCount } from "@/lib/types";
import { getBookmarks, getTotalBookmarkCount, createBookmark, createNote, createBookmarkFromMetadata } from "@/app/actions/bookmarks";
import { getGroups, createGroup, updateGroup, reorderGroups, deleteGroup } from "@/app/actions/groups";
import { parseTextForUrls, parseImageForUrls, unfurlUrl } from "@/app/actions/parse";
import { filterBookmarks, makeOptimisticBookmark } from "./utils";
import { groupsKey, bookmarksKey, bookmarkCountKey } from "@/lib/query-keys";

const OPT_PREFIX = "opt-";
const LAST_GROUP_KEY = "bookmark-last-group";

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
  const [focusedIndex, setFocusedIndex] = useState(0);
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
    refetchInterval: 10 * 1000,
    refetchIntervalInBackground: false,
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

  const refreshGroups = useCallback(() => {
    if (userId) queryClient.invalidateQueries({ queryKey: groupsKey(userId) });
  }, [queryClient, userId]);

  const refreshBookmarks = useCallback(() => {
    if (userId)
      queryClient.invalidateQueries({
        queryKey: bookmarksKey(userId, selectedGroupId, sortKey, sortOrder),
      });
  }, [queryClient, userId, selectedGroupId, sortKey, sortOrder]);

  const handleBookmarksChange = useCallback(async () => {
    if (userId) {
      queryClient.invalidateQueries({ queryKey: groupsKey(userId) });
      queryClient.invalidateQueries({
        queryKey: ["bookmarks", userId],
      });
      queryClient.invalidateQueries({ queryKey: bookmarkCountKey(userId) });
    }
  }, [queryClient, userId]);

  const createBookmarkMutation = useMutation({
    mutationFn: async ({
      url,
      options,
    }: {
      url: string;
      options?: { groupId?: string | null; title?: string; description?: string };
    }) => createBookmark(url, options),
    onSettled: () => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: groupsKey(userId) });
        queryClient.invalidateQueries({ queryKey: ["bookmarks", userId] });
        queryClient.invalidateQueries({ queryKey: bookmarkCountKey(userId) });
      }
    },
  });

  const createNoteMutation = useMutation({
    mutationFn: async ({
      content,
      groupId,
    }: {
      content: string;
      groupId?: string | null;
    }) => createNote(content, groupId),
    onSettled: () => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: groupsKey(userId) });
        queryClient.invalidateQueries({ queryKey: ["bookmarks", userId] });
        queryClient.invalidateQueries({ queryKey: bookmarkCountKey(userId) });
      }
    },
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
    onSettled: () => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: groupsKey(userId) });
        queryClient.invalidateQueries({ queryKey: ["bookmarks", userId] });
        queryClient.invalidateQueries({ queryKey: bookmarkCountKey(userId) });
      }
    },
  });

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
    const clampedFocus =
      displayedBookmarks.length === 0
        ? -1
        : Math.min(Math.max(0, focusedIndex), displayedBookmarks.length - 1);
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const inInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA";
      const inDialog = !!target.closest("[role='dialog']");
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
      if (e.key === " ") {
        if (inInput || inDialog) return;
        if (clampedFocus >= 0 && displayedBookmarks[clampedFocus]) {
          e.preventDefault();
          setPreviewBookmark(displayedBookmarks[clampedFocus]);
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
      const opt = makeOptimisticBookmark(optId, { url: raw, groupId: defaultGroupId }, groups);
      queryClient.setQueryData(
        userId ? bookmarksKey(userId, defaultGroupId, sortKey, sortOrder) : ["bookmarks", "anon"],
        (old: BookmarkWithGroup[] | undefined) => [opt, ...(old ?? [])]
      );
      try {
        const b = await createBookmarkMutation.mutateAsync({
          url: raw,
          options: { groupId: defaultGroupId },
        });
        queryClient.setQueryData(
          userId ? bookmarksKey(userId, defaultGroupId, sortKey, sortOrder) : ["bookmarks", "anon"],
          (prev: BookmarkWithGroup[] | undefined) =>
            prev ? [b, ...prev.filter((x) => x.id !== optId && x.id !== b.id)] : [b]
        );
        refreshGroups();
        toast.success("Saved");
      } catch {
        queryClient.setQueryData(
          userId ? bookmarksKey(userId, defaultGroupId, sortKey, sortOrder) : ["bookmarks", "anon"],
          (prev: BookmarkWithGroup[] | undefined) => prev?.filter((x) => x.id !== optId) ?? []
        );
        toast.error("Failed to save");
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
        (old: BookmarkWithGroup[] | undefined) => [...optimistic, ...(old ?? [])]
      );
      setIsSubmitting(true);
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
            (prev: BookmarkWithGroup[] | undefined) =>
              prev
                ? prev.filter((x) => x.id !== b.id || x.id === optIds[i]).map((x) => (x.id === optIds[i] ? b : x))
                : [b]
          );
        } catch {
          failed++;
          queryClient.setQueryData(
            userId ? bookmarksKey(userId, defaultGroupId, sortKey, sortOrder) : ["bookmarks", "anon"],
            (prev: BookmarkWithGroup[] | undefined) => prev?.filter((x) => x.id !== optIds[i]) ?? []
          );
        }
      }
      if (failed > 0) toast.error(failed === urls.length ? "Failed to save" : `${failed} of ${urls.length} failed`);
      else toast.success(created.length === 1 ? "Saved" : `${created.length} links saved`);
      if (created.length > 0) refreshGroups();
      setIsSubmitting(false);
      return;
    }
    const optId = `${OPT_PREFIX}note-${Date.now()}`;
    const lines = raw.split(/\r?\n/);
    const opt = makeOptimisticBookmark(
      optId,
      { url: null, title: lines[0]?.slice(0, 500) ?? "Note", groupId: defaultGroupId },
      groups
    );
    opt.description = raw;
    queryClient.setQueryData(
      userId ? bookmarksKey(userId, defaultGroupId, sortKey, sortOrder) : ["bookmarks", "anon"],
      (old: BookmarkWithGroup[] | undefined) => [opt, ...(old ?? [])]
    );
    setIsSubmitting(true);
    try {
      const note = await createNoteMutation.mutateAsync({
        content: raw,
        groupId: defaultGroupId,
      });
      queryClient.setQueryData(
        userId ? bookmarksKey(userId, defaultGroupId, sortKey, sortOrder) : ["bookmarks", "anon"],
        (prev: BookmarkWithGroup[] | undefined) =>
          prev ? prev.map((x) => (x.id === optId ? note : x)) : [note]
      );
      toast.success("Note saved");
      refreshGroups();
    } catch {
      queryClient.setQueryData(
        userId ? bookmarksKey(userId, defaultGroupId, sortKey, sortOrder) : ["bookmarks", "anon"],
        (prev: BookmarkWithGroup[] | undefined) => prev?.filter((x) => x.id !== optId) ?? []
      );
      toast.error("Failed to save");
    } finally {
      setIsSubmitting(false);
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
    createBookmarkMutation,
    createNoteMutation,
    createBookmarkFromMetadataMutation,
    refreshGroups,
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
            toast.success(created.length === 1 ? "Saved" : `${created.length} links saved`);
          } else {
            toast.error("No links found in image");
          }
        } catch {
          toast.error("Failed to save");
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

  const setBookmarks = useCallback(
    (updater: (prev: BookmarkWithGroup[]) => BookmarkWithGroup[]) => {
      if (userId) {
        queryClient.setQueryData(
          bookmarksKey(userId, selectedGroupId, sortKey, sortOrder),
          (old: BookmarkWithGroup[] | undefined) => (old ? updater(old) : old)
        );
      }
    },
    [queryClient, userId, selectedGroupId, sortKey, sortOrder]
  );

  const clampedFocus =
    displayedBookmarks.length === 0
      ? -1
      : Math.min(Math.max(0, focusedIndex), displayedBookmarks.length - 1);

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
    handleBookmarksChange,
    previewBookmark,
    setPreviewBookmark,
    showShortcuts,
    setShowShortcuts,
    isSubmitting,
    focusedIndex: clampedFocus,
    setFocusedIndex,
    setBookmarks,
  };
}
