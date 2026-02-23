"use client";

import { useCallback, useEffect, useState } from "react";
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
import { createBookmark } from "@/app/actions/bookmarks";
import { parseTextForUrls, parseImageForUrls, unfurlUrl } from "@/app/actions/parse";
import { createBookmarkFromMetadata } from "@/app/actions/bookmarks";

type GroupWithCount = Group & { _count: { bookmarks: number } };

export function BookmarkApp({
  initialBookmarks,
  initialGroups,
}: {
  initialBookmarks: BookmarkWithGroup[];
  initialGroups: GroupWithCount[];
}) {
  const [bookmarks, setBookmarks] = useState<BookmarkWithGroup[]>(initialBookmarks);
  const [groups, setGroups] = useState<GroupWithCount[]>(initialGroups);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState(false);
  const [sortKey, setSortKey] = useState<"createdAt" | "title">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [inputValue, setInputValue] = useState("");
  const [previewBookmark, setPreviewBookmark] = useState<BookmarkWithGroup | null>(null);

  const refreshBookmarks = useCallback(async () => {
    const next = await getBookmarks({
      groupId: selectedGroupId,
      sort: sortKey,
      order: sortOrder,
    });
    setBookmarks(next);
  }, [selectedGroupId, sortKey, sortOrder]);

  const refreshGroups = useCallback(async () => {
    const next = await getGroups();
    setGroups(next);
  }, []);

  useEffect(() => {
    refreshBookmarks();
  }, [refreshBookmarks]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        setSearchMode((m) => !m);
        setSearchQuery("");
        setInputValue("");
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
    try {
      if (raw.startsWith("http://") || raw.startsWith("https://")) {
        const b = await createBookmark(raw, { groupId: defaultGroupId });
        setBookmarks((prev) => [b, ...prev]);
        return;
      }
      const urls = await parseTextForUrls(raw);
      if (urls.length > 0) {
        const created: BookmarkWithGroup[] = [];
        for (const url of urls) {
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
        }
        setBookmarks((prev) => [...created, ...prev]);
        refreshGroups();
        return;
      }
    } catch {
      refreshBookmarks();
    }
  }, [inputValue, selectedGroupId, refreshBookmarks, refreshGroups]);

  const handleHeroPaste = useCallback(
    async (text: string, files: FileList | null) => {
      if (files?.length) {
        const file = files[0];
        const mime = file.type;
        if (!mime.startsWith("image/")) return;
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
        }
        return;
      }
      if (text?.trim()) {
        setInputValue((v) => (v ? v + "\n" + text : text));
      }
    },
    [selectedGroupId, refreshGroups]
  );

  const filteredBookmarks = searchMode && searchQuery.trim()
    ? bookmarks.filter(
        (b) =>
          b.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          b.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
          b.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : bookmarks;

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
        />
        <BookmarkList
          bookmarks={filteredBookmarks}
          groups={groups}
          sortKey={sortKey}
          sortOrder={sortOrder}
          onSortChange={(key, order) => {
            setSortKey(key);
            setSortOrder(order);
          }}
          onBookmarksChange={refreshBookmarks}
          onBookmarkUpdate={(id, patch) => {
            setBookmarks((prev) =>
              prev.map((b) =>
                b.id === id
                  ? {
                      ...b,
                      ...patch,
                      group: patch.groupId
                        ? groups.find((g) => g.id === patch.groupId!) ?? null
                        : null,
                    }
                  : b
              )
            );
          }}
          onOpenPreview={setPreviewBookmark}
        />
      </main>
      <Dialog open={!!previewBookmark} onOpenChange={(o) => !o && setPreviewBookmark(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="truncate pr-8">
              {previewBookmark
                ? (previewBookmark.title || new URL(previewBookmark.url).hostname)
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
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {previewBookmark.description}
                </p>
              )}
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
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
