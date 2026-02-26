"use client";

import { useCallback, useState, useEffect, useRef } from "react";
import type { BookmarkWithGroup } from "@/app/actions/bookmarks";
import { BookmarkSortHeader } from "./bookmark-sort-header";
import { BookmarkEditCard } from "./bookmark-edit-card";
import { BookmarkRow } from "./bookmark-row";

type EditForm = {
  title: string;
  description: string;
  url: string;
  groupId: string | null;
};
type BookmarkListItem = BookmarkWithGroup & { _clientKey?: string };

export function BookmarkList({
  bookmarks,
  groups,
  sortKey,
  sortOrder,
  onSortChange,
  onGroupsChange,
  onBookmarkUpdate,
  onBookmarkDelete,
  isTransitionLoading,
  focusedIndex,
  onFocusChange,
  openEditId,
}: {
  bookmarks: BookmarkListItem[];
  groups: { id: string; name: string; color: string | null }[];
  sortKey: "createdAt" | "title";
  sortOrder: "asc" | "desc";
  onSortChange: (key: "createdAt" | "title", order: "asc" | "desc") => void;
  onGroupsChange?: () => void;
  onBookmarkUpdate?: (
    id: string,
    patch: Partial<
      Pick<BookmarkWithGroup, "title" | "description" | "url" | "groupId">
    >,
  ) => Promise<void> | void;
  onBookmarkDelete?: (id: string) => Promise<void> | void;
  isTransitionLoading?: boolean;
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

  const handleDelete = useCallback(
    async (id: string) => {
      if (!onBookmarkDelete) return;
      try {
        await onBookmarkDelete(id);
      } catch {
      }
    },
    [onBookmarkDelete],
  );

  const handleSaveEdit = useCallback(async () => {
    if (!editingId || !editing) return;
    const patch = {
      title: editForm.title.trim() || null,
      description: editForm.description.trim() || null,
      url: editForm.url.trim() || null,
      groupId: editForm.groupId || null,
    };
    setEditingId(null);
    try {
      await onBookmarkUpdate?.(editingId, patch);
    } catch {
    }
  }, [editingId, editing, editForm, onBookmarkUpdate]);

  useEffect(() => {
    if (editingId) editCardRef.current?.scrollIntoView({ block: "nearest" });
  }, [editingId]);

  return (
    <div
      className="w-full min-w-0 overflow-hidden"
      onMouseLeave={() => onFocusChange?.(-1)}
    >
      <BookmarkSortHeader
        sortKey={sortKey}
        sortOrder={sortOrder}
        onSortChange={onSortChange}
      />
      {isTransitionLoading && (
        <div className="hidden sm:flex justify-end px-4 pb-1 text-[11px] text-muted-foreground">
          Updating...
        </div>
      )}
      <ul
        className="min-w-0 space-y-3 sm:space-y-0"
        onMouseMove={(e) => {
          if (e.target === e.currentTarget) {
            onFocusChange?.(-1);
          }
        }}
      >
        {bookmarks.map((b, index) =>
          b.id === editingId && editing ? (
            <BookmarkEditCard
              key={b._clientKey ?? b.id}
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
              key={b._clientKey ?? b.id}
              bookmark={b}
              isFocused={focusedIndex === index}
              onEdit={setEditingId}
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
