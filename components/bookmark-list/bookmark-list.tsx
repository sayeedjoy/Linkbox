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
  onBookmarkUpdate,
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
  onBookmarkUpdate?: (
    id: string,
    patch: Partial<
      Pick<BookmarkWithGroup, "title" | "description" | "url" | "groupId">
    >,
  ) => void;
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
      <ul
        className="min-w-0 space-y-3 sm:space-y-0"
        onMouseMove={(e) => {
          if (e.target === e.currentTarget) {
            onFocusChange?.(-1);
          }
        }}
      >
        {bookmarks.map((b) =>
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
              bookmark={b}
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
