"use client";

import { toast } from "sonner";
import { useCallback, useState, useEffect, useRef } from "react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  PencilIcon,
  CopyIcon,
  ExternalLinkIcon,
  TrashIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BookmarkWithGroup } from "@/app/actions/bookmarks";
import { deleteBookmark, updateBookmark } from "@/app/actions/bookmarks";

function formatDate(d: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(d));
}

export function BookmarkList({
  bookmarks,
  groups,
  sortKey,
  sortOrder,
  onSortChange,
  onBookmarksChange,
  onOpenPreview,
  onBookmarkUpdate,
  focusedIndex,
  onFocusChange,
  openEditId,
}: {
  bookmarks: BookmarkWithGroup[];
  groups: { id: string; name: string; color: string | null }[];
  sortKey: "createdAt" | "title";
  sortOrder: "asc" | "desc";
  onSortChange: (key: "createdAt" | "title", order: "asc" | "desc") => void;
  onBookmarksChange: () => void;
  onOpenPreview?: (b: BookmarkWithGroup) => void;
  onBookmarkUpdate?: (
    id: string,
    patch: Partial<Pick<BookmarkWithGroup, "title" | "description" | "url" | "groupId">>
  ) => void;
  focusedIndex?: number;
  onFocusChange?: (index: number) => void;
  openEditId?: string | null;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    url: "",
    groupId: "" as string | null,
  });
  const listRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<(HTMLLIElement | null)[]>([]);

  const editing = editingId ? bookmarks.find((b) => b.id === editingId) : null;
  useEffect(() => {
    if (editing) {
      setEditForm({
        title: editing.title ?? "",
        description: editing.description ?? "",
        url: editing.url ?? "",
        groupId: editing.groupId ?? "",
      });
    }
  }, [editing?.id]);

  useEffect(() => {
    if (openEditId && bookmarks.some((b) => b.id === openEditId)) setEditingId(openEditId);
  }, [openEditId, bookmarks]);

  useEffect(() => {
    rowRefs.current = rowRefs.current.slice(0, bookmarks.length);
  }, [bookmarks.length]);

  const handleCopyUrl = useCallback(async (url: string) => {
    await navigator.clipboard.writeText(url);
  }, []);

  const handleCopyNote = useCallback(async (b: BookmarkWithGroup) => {
    const text = [b.title, b.description].filter(Boolean).join("\n");
    await navigator.clipboard.writeText(text || "");
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteBookmark(id);
        onBookmarksChange();
        toast.success("Deleted");
      } catch {
        onBookmarksChange();
        toast.error("Failed to delete");
      }
    },
    [onBookmarksChange]
  );

  const handleSaveEdit = useCallback(async () => {
    if (!editingId || !editing) return;
    const patch = {
      title: editForm.title.trim() || null,
      description: editForm.description.trim() || null,
      url: editForm.url.trim() || null,
      groupId: editForm.groupId || null,
    };
    onBookmarkUpdate?.(editingId, patch);
    setEditingId(null);
    try {
      await updateBookmark(editingId, patch);
      onBookmarksChange();
    } catch {
      onBookmarksChange();
    }
  }, [editingId, editing, editForm, onBookmarkUpdate, onBookmarksChange]);

  const idx = focusedIndex ?? -1;
  const activeId = idx >= 0 && bookmarks[idx] ? bookmarks[idx].id : undefined;
  const handleListKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (bookmarks.length === 0) return;
      const max = bookmarks.length - 1;
      const current = focusedIndex ?? -1;
      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        onFocusChange?.(current >= max ? max : current + 1);
        return;
      }
      if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        onFocusChange?.(current <= 0 ? 0 : current - 1);
        return;
      }
      if (e.key === "Enter" && current >= 0 && bookmarks[current]) {
        e.preventDefault();
        const b = bookmarks[current];
        if (b.url) window.open(b.url, "_blank");
        else onOpenPreview?.(b);
        return;
      }
      if ((e.key === "Backspace" || e.key === "Delete") && current >= 0 && bookmarks[current]) {
        e.preventDefault();
        handleDelete(bookmarks[current].id);
        onFocusChange?.(Math.min(current, max - 1));
        return;
      }
      if (e.key === "e" && current >= 0 && bookmarks[current]) {
        e.preventDefault();
        setEditingId(bookmarks[current].id);
      }
    },
    [bookmarks, focusedIndex, onFocusChange, onOpenPreview]
  );

  useEffect(() => {
    const i = focusedIndex ?? -1;
    if (i >= 0 && rowRefs.current[i]) rowRefs.current[i]?.scrollIntoView({ block: "nearest" });
  }, [focusedIndex]);

  return (
    <div
      ref={listRef}
      className="w-full border border-border rounded-lg overflow-hidden"
      tabIndex={0}
      role="listbox"
      aria-activedescendant={activeId ? `bookmark-row-${activeId}` : undefined}
      onKeyDown={handleListKeyDown}
    >
      <div className="grid grid-cols-[auto_1fr_auto] gap-4 items-center px-4 py-2 bg-muted/30 border-b border-border text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <button
          type="button"
          className="flex items-center gap-1 hover:text-foreground"
          onClick={() =>
            onSortChange(
              "title",
              sortKey === "title" && sortOrder === "asc" ? "desc" : "asc"
            )
          }
        >
          Title
          {sortKey === "title" ? (
            sortOrder === "asc" ? (
              <ArrowUpIcon className="size-3" />
            ) : (
              <ArrowDownIcon className="size-3" />
            )
          ) : null}
        </button>
        <div className="flex items-center gap-2 text-muted-foreground font-normal normal-case">
          <span>j/k navigate</span>
          <span>Enter open</span>
          <span>e edit</span>
          <span>Del delete</span>
        </div>
        <button
          type="button"
          className="flex items-center gap-1 hover:text-foreground justify-self-end"
          onClick={() =>
            onSortChange(
              "createdAt",
              sortKey === "createdAt" && sortOrder === "asc" ? "desc" : "asc"
            )
          }
        >
          Created at
          {sortKey === "createdAt" ? (
            sortOrder === "asc" ? (
              <ArrowUpIcon className="size-3" />
            ) : (
              <ArrowDownIcon className="size-3" />
            )
          ) : null}
        </button>
      </div>
      <ul className="divide-y divide-border">
        {bookmarks.map((b, index) => (
          <li
            key={b.id}
            id={`bookmark-row-${b.id}`}
            role="option"
            aria-selected={focusedIndex === index}
            ref={(el) => { rowRefs.current[index] = el; }}
            className={`grid grid-cols-[auto_1fr_auto] gap-4 items-center px-4 py-3 hover:bg-muted/20 group ${focusedIndex === index ? "bg-muted/40" : ""}`}
          >
            <div className="flex items-center gap-3 min-w-0">
              {b.faviconUrl ? (
                <img
                  src={b.faviconUrl}
                  alt=""
                  className="size-5 shrink-0 rounded"
                />
              ) : (
                <div className="size-5 shrink-0 rounded bg-muted" />
              )}
              <div className="min-w-0">
                <div className="font-medium truncate">
                  {b.title || (b.url ? new URL(b.url).hostname : "Note")}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {b.url ? new URL(b.url).hostname : (b.description?.slice(0, 60) ?? "Note")}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 justify-self-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => setEditingId(b.id)}
                aria-label="Edit"
              >
                <PencilIcon className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => (b.url ? handleCopyUrl(b.url) : handleCopyNote(b))}
                aria-label={b.url ? "Copy URL" : "Copy note"}
              >
                <CopyIcon className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => onOpenPreview?.(b)}
                aria-label="Preview"
              >
                <span className="text-xs">Space</span>
              </Button>
              {b.url ? (
                <a
                  href={b.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center size-8 rounded-md hover:bg-muted"
                  aria-label="Open in new tab"
                >
                  <ExternalLinkIcon className="size-4" />
                </a>
              ) : null}
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-destructive hover:text-destructive"
                onClick={() => handleDelete(b.id)}
                aria-label="Delete"
              >
                <TrashIcon className="size-4" />
              </Button>
            </div>
            <div className="text-xs text-muted-foreground justify-self-end">
              {formatDate(b.createdAt)}
            </div>
          </li>
        ))}
      </ul>
      {bookmarks.length === 0 && (
        <div className="px-4 py-12 text-center text-sm text-muted-foreground">
          No bookmarks yet. Paste a link above to add one.
        </div>
      )}
      <Dialog open={!!editingId} onOpenChange={(o) => !o && setEditingId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit bookmark</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editForm.title}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, title: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-url">URL</Label>
              <Input
                id="edit-url"
                value={editForm.url}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, url: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-desc">Description</Label>
              <Input
                id="edit-desc"
                value={editForm.description}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>Group</Label>
              <Select
                value={editForm.groupId ?? "none"}
                onValueChange={(v) =>
                  setEditForm((f) => ({
                    ...f,
                    groupId: v === "none" ? null : v,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="No group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No group</SelectItem>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter showCloseButton={false}>
            <Button variant="outline" onClick={() => setEditingId(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
