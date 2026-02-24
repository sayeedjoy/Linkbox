"use client";

import { forwardRef, useState, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ChevronDownIcon, PlusIcon } from "lucide-react";
import { createGroup } from "@/app/actions/groups";
import { GroupFormDialog, GROUP_COLORS } from "@/components/group-dropdown/group-form-dialog";
import type { BookmarkWithGroup } from "@/app/actions/bookmarks";

type EditForm = {
  title: string;
  description: string;
  url: string;
  groupId: string | null;
};

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

  return (
    <li
      ref={ref}
      id={`bookmark-row-${bookmark.id}`}
      className="rounded-2xl border border-border bg-background overflow-hidden p-4 sm:p-5 flex flex-col gap-4"
    >
      <div className="flex items-center gap-3 min-w-0">
        {bookmark.faviconUrl ? (
          <img
            src={bookmark.faviconUrl}
            alt=""
            className="size-6 shrink-0 rounded"
          />
        ) : (
          <div className="size-6 shrink-0 rounded bg-muted" />
        )}
        <Input
          value={editForm.title}
          onChange={(e) =>
            onEditFormChange({ ...editForm, title: e.target.value })
          }
          placeholder="Title"
          className="min-w-0 flex-1 border-0 px-0 h-auto text-base font-medium focus-visible:ring-0 focus-visible:ring-offset-0"
        />
      </div>
      <Input
        value={editForm.url}
        onChange={(e) =>
          onEditFormChange({ ...editForm, url: e.target.value })
        }
        placeholder="URL"
        className="text-muted-foreground text-sm"
      />
      <Textarea
        value={editForm.description}
        onChange={(e) =>
          onEditFormChange({ ...editForm, description: e.target.value })
        }
        placeholder="Description"
        rows={3}
        className="min-h-20 resize-none"
      />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="w-fit bg-muted/50 hover:bg-muted/70 border-0 rounded-full px-3 py-2 h-auto font-normal"
            >
              <span
                className="size-2.5 rounded-full shrink-0 mr-2"
                style={{ backgroundColor: triggerDotColor }}
              />
              {label}
              <ChevronDownIcon className="size-4 opacity-50 ml-1" />
            </Button>
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
              <PlusIcon className="size-4" />
              New Group
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onSave}>Save</Button>
        </div>
      </div>
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
