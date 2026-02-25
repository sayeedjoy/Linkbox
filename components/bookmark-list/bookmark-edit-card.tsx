"use client";

import { forwardRef, useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Plus } from "lucide-react";
import { createGroup } from "@/app/actions/groups";
import { GroupFormDialog, GROUP_COLORS } from "@/components/group-dropdown/group-form-dialog";
import type { BookmarkWithGroup } from "@/app/actions/bookmarks";
import { safeHostname } from "./utils";

type EditForm = {
  title: string;
  description: string;
  url: string;
  groupId: string | null;
};

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    setIsDesktop(mq.matches);
    const handler = () => setIsDesktop(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isDesktop;
}

export const BookmarkEditCard = forwardRef<
  HTMLLIElement,
  {
    bookmark: BookmarkWithGroup;
    groups: { id: string; name: string; color: string | null }[];
    editForm: EditForm;
    onEditFormChange: (form: EditForm) => void;
    onSave: () => void;
    onCancel: () => void;
    onGroupsChange?: () => void;
  }
>(function BookmarkEditCardInner(
  { bookmark, groups, editForm, onEditFormChange, onSave, onCancel, onGroupsChange },
  ref
) {
  const isDesktop = useIsDesktop();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(GROUP_COLORS[0]);

  const handleCreate = useCallback(async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      const newGroup = await createGroup(name, newColor);
      setNewName("");
      setNewColor(GROUP_COLORS[0]);
      setCreateOpen(false);
      setDropdownOpen(false);
      onEditFormChange({ ...editForm, groupId: newGroup.id });
      onGroupsChange?.();
      toast.success("Group created");
    } catch {
      toast.error("Failed to create group");
    }
  }, [newName, newColor, editForm, onEditFormChange, onGroupsChange]);

  const label =
    editForm.groupId == null
      ? "No group"
      : groups.find((g) => g.id === editForm.groupId)?.name ?? "No group";
  const triggerDotColor =
    editForm.groupId == null
      ? "#6b7280"
      : groups.find((g) => g.id === editForm.groupId)?.color ?? "#6b7280";

  const linkUrl = (editForm.url?.trim() || bookmark.url) ?? "";
  const hostname = linkUrl ? safeHostname(linkUrl) : "";
  const faviconSrc =
    typeof bookmark.faviconUrl === "string" && bookmark.faviconUrl.trim()
      ? bookmark.faviconUrl.trim()
      : hostname
        ? `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(hostname)}`
        : null;

  const card = (
    <div className="w-full rounded-xl border border-border bg-card p-3">
      <div className="mb-2 flex items-center gap-2 min-w-0">
        {faviconSrc ? (
          <img
            src={faviconSrc}
            alt=""
            className="size-5 shrink-0 rounded-md"
          />
        ) : (
          <div className="size-5 shrink-0 rounded-md bg-muted" />
        )}
        <input
          type="text"
          value={editForm.title}
          onChange={(e) =>
            onEditFormChange({ ...editForm, title: e.target.value })
          }
          placeholder="Title"
          className="min-w-0 flex-1 bg-transparent text-sm font-medium focus:outline-none"
        />
      </div>
      <input
        type="url"
        value={editForm.url}
        onChange={(e) =>
          onEditFormChange({ ...editForm, url: e.target.value })
        }
        placeholder="URL (optional)"
        className="mb-2 w-full bg-transparent text-sm text-muted-foreground focus:outline-none"
      />
      <textarea
        value={editForm.description}
        onChange={(e) =>
          onEditFormChange({ ...editForm, description: e.target.value })
        }
        placeholder="Add a description..."
        rows={2}
        className="mb-3 w-full resize-none bg-transparent text-sm text-muted-foreground focus:outline-none"
      />
      <div className="mb-3">
        <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-muted"
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: triggerDotColor }}
              />
              {label}
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="bottom" className="rounded-xl min-w-[200px]">
            <DropdownMenuCheckboxItem
              checked={editForm.groupId == null}
              onSelect={() =>
                onEditFormChange({ ...editForm, groupId: null })
              }
            >
              <span
                className="size-2.5 rounded-full shrink-0 mr-2 inline-block"
                style={{ backgroundColor: "#6b7280" }}
              />
              No group
            </DropdownMenuCheckboxItem>
            {groups.map((g) => (
              <DropdownMenuCheckboxItem
                key={g.id}
                checked={editForm.groupId === g.id}
                onSelect={() =>
                  onEditFormChange({ ...editForm, groupId: g.id })
                }
              >
                <span
                  className="size-2.5 rounded-full shrink-0 mr-2 inline-block"
                  style={{ backgroundColor: g.color ?? "#6b7280" }}
                />
                {g.name}
              </DropdownMenuCheckboxItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              New Group
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          className="rounded-md bg-foreground px-2 py-1 text-xs text-background hover:bg-foreground/90"
        >
          Save
        </button>
      </div>
    </div>
  );

  return (
    <li
      ref={ref}
      id={`bookmark-row-${bookmark.id}`}
    >
      {isDesktop ? <div draggable={false}>{card}</div> : card}
      <GroupFormDialog
        mode="create"
        name={newName}
        color={newColor}
        onNameChange={setNewName}
        onColorChange={setNewColor}
        onSubmit={handleCreate}
        onCancel={() => setCreateOpen(false)}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </li>
  );
});
