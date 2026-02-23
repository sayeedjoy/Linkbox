"use client";

import { useCallback, useEffect, useMemo, useState, useDeferredValue } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import type { BookmarkWithGroup } from "@/app/actions/bookmarks";
import type { GroupWithCount } from "@/lib/types";
import { getBookmarks, getTotalBookmarkCount } from "@/app/actions/bookmarks";
import { getGroups } from "@/app/actions/groups";
import { createBookmark, createNote } from "@/app/actions/bookmarks";
import { parseTextForUrls, parseImageForUrls, unfurlUrl } from "@/app/actions/parse";
import { createBookmarkFromMetadata } from "@/app/actions/bookmarks";
import { filterBookmarks, makeOptimisticBookmark } from "./utils";

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
  const [bookmarks, setBookmarks] = useState<BookmarkWithGroup[]>(initialBookmarks);
  const [groups, setGroups] = useState<GroupWithCount[]>(initialGroups);
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

  const displayedBookmarks = useMemo(
    () => (searchMode ? filterBookmarks(bookmarks, deferredSearchQuery) : bookmarks),
    [searchMode, bookmarks, deferredSearchQuery]
  );

  const refreshBookmarks = useCallback(async () => {
    const next = await getBookmarks({
      groupId: selectedGroupId,
      sort: sortKey,
      order: sortOrder,
    });
    setBookmarks(next);
  }, [selectedGroupId, sortKey, sortOrder]);

  const [totalBookmarkCount, setTotalBookmarkCount] = useState(initialTotalBookmarkCount);

  const refreshGroups = useCallback(async () => {
    const [nextGroups, total] = await Promise.all([getGroups(), getTotalBookmarkCount()]);
    setGroups(nextGroups);
    setTotalBookmarkCount(total);
  }, []);

  useEffect(() => {
    refreshBookmarks();
  }, [refreshBookmarks]);

  useEffect(() => {
    refreshGroups();
  }, [refreshGroups]);

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
      setBookmarks((prev) => [opt, ...prev]);
      try {
        const b = await createBookmark(raw, { groupId: defaultGroupId });
        setBookmarks((prev) => [b, ...prev.filter((x) => x.id !== optId && x.id !== b.id)]);
        refreshGroups();
        toast.success("Saved");
      } catch {
        setBookmarks((prev) => prev.filter((x) => x.id !== optId));
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
      setBookmarks((prev) => [...optimistic, ...prev]);
      setIsSubmitting(true);
      const created: BookmarkWithGroup[] = [];
      let failed = 0;
      for (let i = 0; i < urls.length; i++) {
        try {
          const meta = await unfurlUrl(urls[i]);
          const b = await createBookmarkFromMetadata(
            urls[i],
            {
              title: meta.title,
              description: meta.description,
              faviconUrl: meta.faviconUrl,
              previewImageUrl: meta.previewImageUrl,
            },
            defaultGroupId
          );
          created.push(b);
          setBookmarks((prev) =>
            prev.filter((x) => x.id !== b.id || x.id === optIds[i]).map((x) => (x.id === optIds[i] ? b : x))
          );
        } catch {
          failed++;
          setBookmarks((prev) => prev.filter((x) => x.id !== optIds[i]));
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
    const opt = makeOptimisticBookmark(optId, {
      url: null,
      title: lines[0]?.slice(0, 500) ?? "Note",
      groupId: defaultGroupId,
    }, groups);
    opt.description = raw;
    setBookmarks((prev) => [opt, ...prev]);
    setIsSubmitting(true);
    try {
      const note = await createNote(raw, defaultGroupId);
      setBookmarks((prev) => prev.map((x) => (x.id === optId ? note : x)));
      toast.success("Note saved");
      refreshGroups();
    } catch {
      setBookmarks((prev) => prev.filter((x) => x.id !== optId));
      toast.error("Failed to save");
    } finally {
      setIsSubmitting(false);
    }
  }, [inputValue, selectedGroupId, groups, refreshGroups]);

  const handleBookmarksChange = useCallback(async () => {
    await refreshBookmarks();
    await refreshGroups();
  }, [refreshBookmarks, refreshGroups]);

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
              const b = await createBookmarkFromMetadata(
                url,
                {
                  title: meta.title,
                  description: meta.description,
                  faviconUrl: meta.faviconUrl,
                  previewImageUrl: meta.previewImageUrl,
                },
                defaultGroupId
              );
              created.push(b);
            } catch {
            }
          }
          if (created.length) {
            setBookmarks((prev) => [...created, ...prev]);
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
    [selectedGroupId, refreshGroups]
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
