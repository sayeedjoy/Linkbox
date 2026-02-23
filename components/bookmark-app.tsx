"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { GroupDropdown } from "@/components/group-dropdown";
import { UserMenu } from "@/components/user-menu";
import { BookmarkHeroInput } from "@/components/bookmark-hero-input";
import { BookmarkList } from "@/components/bookmark-list";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { BookmarkWithGroup } from "@/app/actions/bookmarks";
import type { Group } from "@/app/generated/prisma/client";
import { getBookmarks } from "@/app/actions/bookmarks";
import { getGroups } from "@/app/actions/groups";
import { createBookmark, createNote } from "@/app/actions/bookmarks";
import { parseTextForUrls, parseImageForUrls, unfurlUrl } from "@/app/actions/parse";
import { createBookmarkFromMetadata } from "@/app/actions/bookmarks";

const SEARCH_DEBOUNCE_MS = 300;
const OPT_PREFIX = "opt-";

type GroupWithCount = Group & { _count: { bookmarks: number } };

function makeOptimisticBookmark(
  optId: string,
  payload: { url?: string | null; title?: string | null; groupId?: string | null },
  groups: GroupWithCount[]
): BookmarkWithGroup {
  const group = payload.groupId ? groups.find((g) => g.id === payload.groupId) ?? null : null;
  const now = new Date();
  return {
    id: optId,
    userId: "",
    groupId: payload.groupId ?? null,
    url: payload.url ?? null,
    title: payload.title ?? "Loading…",
    description: null,
    faviconUrl: null,
    previewImageUrl: null,
    createdAt: now,
    updatedAt: now,
    group: group ? { id: group.id, name: group.name, color: group.color } : null,
  };
}

export function BookmarkApp({
  initialBookmarks,
  initialGroups,
}: {
  initialBookmarks: BookmarkWithGroup[];
  initialGroups: GroupWithCount[];
}) {
  const [bookmarks, setBookmarks] = useState<BookmarkWithGroup[]>(initialBookmarks);
  const [searchResults, setSearchResults] = useState<BookmarkWithGroup[]>(initialBookmarks);
  const [groups, setGroups] = useState<GroupWithCount[]>(initialGroups);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState(false);
  const [sortKey, setSortKey] = useState<"createdAt" | "title">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [inputValue, setInputValue] = useState("");
  const [previewBookmark, setPreviewBookmark] = useState<BookmarkWithGroup | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshBookmarks = useCallback(async () => {
    const next = await getBookmarks({
      groupId: selectedGroupId,
      sort: sortKey,
      order: sortOrder,
    });
    setBookmarks(next);
    if (!searchMode) setSearchResults(next);
    else {
      const q = searchQuery.trim();
      const searchNext = await getBookmarks({
        groupId: selectedGroupId,
        search: q || undefined,
        sort: sortKey,
        order: sortOrder,
      });
      setSearchResults(searchNext);
    }
  }, [selectedGroupId, sortKey, sortOrder, searchMode, searchQuery]);

  const refreshGroups = useCallback(async () => {
    const next = await getGroups();
    setGroups(next);
  }, []);

  useEffect(() => {
    refreshBookmarks();
  }, [refreshBookmarks]);

  useEffect(() => {
    if (!searchMode) return;
    const q = searchQuery.trim();
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = null;
    }
    const run = async () => {
      const next = await getBookmarks({
        groupId: selectedGroupId,
        search: q || undefined,
        sort: sortKey,
        order: sortOrder,
      });
      setSearchResults(next);
    };
    searchDebounceRef.current = setTimeout(run, SEARCH_DEBOUNCE_MS);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchMode, searchQuery, selectedGroupId, sortKey, sortOrder]);

  useEffect(() => {
    if (!searchMode) setSearchResults(bookmarks);
  }, [searchMode, bookmarks]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        setSearchMode((m) => !m);
        setSearchQuery("");
        setInputValue("");
      }
      if (e.key === "?" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement;
        if (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA" && !target.closest("[role='dialog']")) {
          e.preventDefault();
          setShowShortcuts((s) => !s);
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleHeroSubmit = useCallback(async () => {
    if (searchMode) return;
    const raw = inputValue.trim();
    if (!raw) return;
    setInputValue("");
    const defaultGroupId =
      typeof window !== "undefined" && localStorage.getItem("bookmark-auto-group") === "true"
        ? selectedGroupId
        : null;
    if (raw.startsWith("http://") || raw.startsWith("https://")) {
      const optId = `${OPT_PREFIX}${Date.now()}`;
      const opt = makeOptimisticBookmark(optId, { url: raw, title: "Loading…", groupId: defaultGroupId }, groups);
      setBookmarks((prev) => [opt, ...prev]);
      setSearchResults((prev) => [opt, ...prev]);
      setIsSubmitting(true);
      try {
        const b = await createBookmark(raw, { groupId: defaultGroupId });
        setBookmarks((prev) => [b, ...prev.filter((x) => x.id !== optId && x.id !== b.id)]);
        setSearchResults((prev) => [b, ...prev.filter((x) => x.id !== optId && x.id !== b.id)]);
        toast.success("Saved");
      } catch {
        setBookmarks((prev) => prev.filter((x) => x.id !== optId));
        setSearchResults((prev) => prev.filter((x) => x.id !== optId));
        toast.error("Failed to save");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }
    const urls = await parseTextForUrls(raw);
    if (urls.length > 0) {
      const optIds = urls.map((_, i) => `${OPT_PREFIX}${Date.now()}-${i}`);
      const optimistic = optIds.map((id, i) =>
        makeOptimisticBookmark(id, { url: urls[i], title: "Loading…", groupId: defaultGroupId }, groups)
      );
      setBookmarks((prev) => [...optimistic, ...prev]);
      setSearchResults((prev) => [...optimistic, ...prev]);
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
          setSearchResults((prev) =>
            prev.filter((x) => x.id !== b.id || x.id === optIds[i]).map((x) => (x.id === optIds[i] ? b : x))
          );
        } catch {
          failed++;
          setBookmarks((prev) => prev.filter((x) => x.id !== optIds[i]));
          setSearchResults((prev) => prev.filter((x) => x.id !== optIds[i]));
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
    setSearchResults((prev) => [opt, ...prev]);
    setIsSubmitting(true);
    try {
      const note = await createNote(raw, defaultGroupId);
      setBookmarks((prev) => prev.map((x) => (x.id === optId ? note : x)));
      setSearchResults((prev) => prev.map((x) => (x.id === optId ? note : x)));
      toast.success("Note saved");
      refreshGroups();
    } catch {
      setBookmarks((prev) => prev.filter((x) => x.id !== optId));
      setSearchResults((prev) => prev.filter((x) => x.id !== optId));
      toast.error("Failed to save");
    } finally {
      setIsSubmitting(false);
    }
  }, [inputValue, selectedGroupId, groups, refreshGroups]);

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
          const defaultGroupId =
            typeof window !== "undefined" && localStorage.getItem("bookmark-auto-group") === "true"
              ? selectedGroupId
              : null;
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
              //
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

  const displayedBookmarks = searchMode ? searchResults : bookmarks;
  const clampedFocus =
    displayedBookmarks.length === 0
      ? -1
      : Math.min(Math.max(0, focusedIndex), displayedBookmarks.length - 1);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="flex items-center justify-between gap-4 px-6 py-4 border-b border-border">
        <GroupDropdown
          groups={groups}
          selectedGroupId={selectedGroupId}
          onSelectGroupId={setSelectedGroupId}
          onGroupsChange={refreshGroups}
        />
        <UserMenu />
      </header>
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-6 flex flex-col gap-6">
        <BookmarkHeroInput
          value={searchMode ? searchQuery : inputValue}
          onChange={searchMode ? setSearchQuery : setInputValue}
          onSubmit={handleHeroSubmit}
          onPaste={handleHeroPaste}
          searchMode={searchMode}
          disabled={isSubmitting}
        />
        <BookmarkList
          bookmarks={displayedBookmarks}
          groups={groups}
          sortKey={sortKey}
          sortOrder={sortOrder}
          onSortChange={(key, order) => {
            setSortKey(key);
            setSortOrder(order);
          }}
          onBookmarksChange={refreshBookmarks}
          onBookmarkUpdate={(id, patch) => {
            const upd = (b: BookmarkWithGroup) =>
              b.id === id
                ? {
                    ...b,
                    ...patch,
                    group: patch.groupId
                      ? groups.find((g) => g.id === patch.groupId!) ?? null
                      : null,
                  }
                : b;
            setBookmarks((prev) => prev.map(upd));
            setSearchResults((prev) => prev.map(upd));
          }}
          onOpenPreview={setPreviewBookmark}
          focusedIndex={clampedFocus}
          onFocusChange={setFocusedIndex}
        />
      </main>
      <Dialog open={!!previewBookmark} onOpenChange={(o) => !o && setPreviewBookmark(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="truncate pr-8">
              {previewBookmark
                ? (previewBookmark.title || (previewBookmark.url ? new URL(previewBookmark.url).hostname : "Note"))
                : ""}
            </DialogTitle>
          </DialogHeader>
          {previewBookmark && (
            <div className="space-y-3">
              {previewBookmark.previewImageUrl && (
                <img
                  src={previewBookmark.previewImageUrl}
                  alt=""
                  className="w-full rounded-lg border border-border object-cover max-h-48"
                />
              )}
              {previewBookmark.description && (
                <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                  {previewBookmark.description}
                </p>
              )}
              {previewBookmark.url ? (
                <>
                  <a
                    href={previewBookmark.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-foreground truncate block"
                  >
                    {previewBookmark.url}
                  </a>
                  <Button asChild size="sm">
                    <a href={previewBookmark.url} target="_blank" rel="noopener noreferrer">
                      Open
                    </a>
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  onClick={() => {
                    const text = [previewBookmark.title, previewBookmark.description].filter(Boolean).join("\n");
                    navigator.clipboard.writeText(text || "");
                  }}
                >
                  Copy
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={showShortcuts} onOpenChange={setShowShortcuts}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Keyboard shortcuts</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Search</span>
              <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">⌘F</kbd>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Move down</span>
              <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">j</kbd> or <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">↓</kbd>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Move up</span>
              <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">k</kbd> or <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">↑</kbd>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Open bookmark</span>
              <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">Enter</kbd>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Edit</span>
              <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">e</kbd>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Delete</span>
              <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">Backspace</kbd> / <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">Delete</kbd>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">This help</span>
              <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">?</kbd>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
