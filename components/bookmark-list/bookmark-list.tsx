"use client";

import { toast } from "sonner";
import { useCallback, useState, useEffect, useRef } from "react";
import type { BookmarkWithGroup } from "@/app/actions/bookmarks";
import { deleteBookmark, updateBookmark } from "@/app/actions/bookmarks";
import { BookmarkSortHeader } from "./bookmark-sort-header";
import { BookmarkEditCard } from "./bookmark-edit-card";
import { BookmarkRow } from "./bookmark-row";

type EditForm = {
  title: string;
  description: string;
  url: string;
  groupId: string | null;
};

export function BookmarkList({
  bookmarks,
  groups,
  sortKey,
  sortOrder,
  onSortChange,
  onBookmarksChange,
  onGroupsChange,
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
  onGroupsChange?: () => void;
  onOpenPreview?: (b: BookmarkWithGroup) => void;
  onBookmarkUpdate?: (
    id: string,
    patch: Partial<
      Pick<BookmarkWithGroup, "title" | "description" | "url" | "groupId">
    >,
  ) => void;
  focusedIndex?: number;
  onFocusChange?: (index: number) => void;
  openEditId?: string | null;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    title: "",
    description: "",
    url: "",
    groupId: "" as string | null,
  });
  const listRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<(HTMLLIElement | null)[]>([]);
  const editCardRef = useRef<HTMLLIElement | null>(null);

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
    if (openEditId && bookmarks.some((b) => b.id === openEditId))
      setEditingId(openEditId);
  }, [openEditId, bookmarks]);

  useEffect(() => {
    rowRefs.current = rowRefs.current.slice(0, bookmarks.length);
  }, [bookmarks.length]);

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
    [onBookmarksChange],
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
      if (e.key === " " && current >= 0 && bookmarks[current]) {
        e.preventDefault();
        onOpenPreview?.(bookmarks[current]);
        return;
      }
      if (
        (e.key === "Backspace" || e.key === "Delete") &&
        current >= 0 &&
        bookmarks[current]
      ) {
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
    [bookmarks, focusedIndex, onFocusChange, onOpenPreview, handleDelete],
  );

  useEffect(() => {
    const i = focusedIndex ?? -1;
    if (i >= 0 && rowRefs.current[i])
      rowRefs.current[i]?.scrollIntoView({ block: "nearest" });
  }, [focusedIndex]);

  useEffect(() => {
    if (editingId) editCardRef.current?.scrollIntoView({ block: "nearest" });
  }, [editingId]);

  return (
    <div
      ref={listRef}
      className="w-full min-w-0 overflow-hidden"
      tabIndex={0}
      role="listbox"
      aria-activedescendant={activeId ? `bookmark-row-${activeId}` : undefined}
      onKeyDown={handleListKeyDown}
    >
      <BookmarkSortHeader
        sortKey={sortKey}
        sortOrder={sortOrder}
        onSortChange={onSortChange}
      />
      <ul className="min-w-0 space-y-3 sm:space-y-0">
        {bookmarks.map((b, index) =>
          b.id === editingId && editing ? (
            <BookmarkEditCard
              key={b.id}
              ref={editCardRef}
              bookmark={editing}
              groups={groups}
              editForm={editForm}
              onEditFormChange={setEditForm}
              onSave={handleSaveEdit}
              onCancel={() => setEditingId(null)}
              onGroupsChange={onGroupsChange}
            />
          ) : (
            <BookmarkRow
              key={b.id}
              ref={(el) => {
                rowRefs.current[index] = el;
              }}
              bookmark={b}
              index={index}
              isFocused={focusedIndex === index}
              onEdit={setEditingId}
              onPreview={(bm) => onOpenPreview?.(bm)}
              onDelete={handleDelete}
            />
          )
        )}
      </ul>
      {bookmarks.length === 0 && (
        <div className="px-4 py-12 text-center text-sm text-muted-foreground">
          No bookmarks yet. Paste a link above to add one.
        </div>
      )}
    </div>
  );
}
