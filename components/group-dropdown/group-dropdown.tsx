"use client";

import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown, Plus, List, Pencil, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
import type { DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { createGroup, reorderGroups, updateGroup, deleteGroup } from "@/app/actions/groups";
import type { GroupWithCount } from "@/lib/types";
import { GROUP_COLORS } from "./group-form-dialog";
import { GroupFormDialog } from "./group-form-dialog";
import { GroupReorderDialog } from "./group-reorder-dialog";
import { GroupDeleteDialog } from "./group-delete-dialog";

export function GroupDropdown({
  groups,
  totalBookmarkCount,
  selectedGroupId,
  onSelectGroupId,
  onGroupsChange,
}: {
  groups: GroupWithCount[];
  totalBookmarkCount: number;
  selectedGroupId: string | null;
  onSelectGroupId: (id: string | null) => void;
  onGroupsChange: () => void;
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [reorderOpen, setReorderOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<GroupWithCount | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState(GROUP_COLORS[0]);
  const [deleteTarget, setDeleteTarget] = useState<GroupWithCount | null>(null);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(GROUP_COLORS[0]);

  const handleReorderEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const ids = groups.map((g) => g.id);
      const oldIndex = ids.indexOf(active.id as string);
      const newIndex = ids.indexOf(over.id as string);
      if (oldIndex === -1 || newIndex === -1) return;
      const reordered = arrayMove(ids, oldIndex, newIndex);
      try {
        await reorderGroups(reordered);
        onGroupsChange();
        toast.success("Order updated");
      } catch {
        toast.error("Failed to reorder");
      }
    },
    [groups, onGroupsChange]
  );

  const handleCreate = useCallback(async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      const newGroup = await createGroup(name, newColor);
      setNewName("");
      setCreateOpen(false);
      setDropdownOpen(false);
      onSelectGroupId(newGroup.id);
      onGroupsChange();
      toast.success("Group created");
    } catch {
      toast.error("Failed to create group");
    }
  }, [newName, newColor, onGroupsChange, onSelectGroupId]);

  const handleEditSave = useCallback(async () => {
    if (!editingGroup) return;
    const name = editName.trim();
    if (!name) return;
    try {
      await updateGroup(editingGroup.id, { name, color: editColor });
      onGroupsChange();
      setEditingGroup(null);
      toast.success("Group updated");
    } catch {
      toast.error("Failed to update group");
    }
  }, [editingGroup, editName, editColor, onGroupsChange]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteGroup(deleteTarget.id);
      onGroupsChange();
      if (selectedGroupId === deleteTarget.id) onSelectGroupId(null);
      setDeleteTarget(null);
      toast.success("Group deleted");
    } catch {
      toast.error("Failed to delete group");
    }
  }, [deleteTarget, selectedGroupId, onGroupsChange, onSelectGroupId]);

  const label =
    selectedGroupId === null
      ? "All Bookmarks"
      : groups.find((g) => g.id === selectedGroupId)?.name ?? "All Bookmarks";
  const triggerDotColor =
    selectedGroupId === null
      ? "#6b7280"
      : groups.find((g) => g.id === selectedGroupId)?.color ?? "#6b7280";

  const handleEditClick = useCallback(
    (e: React.MouseEvent | React.PointerEvent, g: GroupWithCount) => {
      e.preventDefault();
      e.stopPropagation();
      setEditingGroup(g);
      setEditName(g.name);
      setEditColor(g.color ?? GROUP_COLORS[0]);
      setDropdownOpen(false);
    },
    []
  );

  const handleDeleteClick = useCallback(
    (e: React.MouseEvent | React.PointerEvent, g: GroupWithCount) => {
      e.preventDefault();
      e.stopPropagation();
      setDeleteTarget(g);
      setDropdownOpen(false);
    },
    []
  );

  return (
    <>
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2 font-normal min-w-0 max-w-[calc(100vw-8rem)]">
            <span
              className="size-3 rounded-full shrink-0"
              style={{ backgroundColor: triggerDotColor }}
            />
            <span className="min-w-0 truncate">{label}</span>
            <ChevronDown className="size-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[200px]">
          <DropdownMenuCheckboxItem
            checked={selectedGroupId === null}
            onSelect={() => onSelectGroupId(null)}
          >
            <span
              className="size-3 rounded-full mr-2 shrink-0"
              style={{ backgroundColor: "#6b7280" }}
            />
            All Bookmarks
            <span className="ml-auto text-muted-foreground text-xs pl-2">
              {totalBookmarkCount}
            </span>
          </DropdownMenuCheckboxItem>
          {groups.length > 0 && <DropdownMenuSeparator />}
          {groups.map((g) => (
            <DropdownMenuCheckboxItem
              key={g.id}
              checked={selectedGroupId === g.id}
              onSelect={() => onSelectGroupId(g.id)}
              className="group/group-row"
            >
              <span
                className="size-3 rounded-full mr-2 shrink-0"
                style={{ backgroundColor: g.color ?? "#6b7280" }}
              />
              <span className="truncate flex-1 min-w-0">{g.name}</span>
              <span className="opacity-0 group-hover/group-row:opacity-100 flex items-center gap-0.5 ml-1 transition-opacity">
                <button
                  type="button"
                  className="p-0.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                  onClick={(e) => handleEditClick(e, g)}
                  onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  aria-label="Edit group"
                >
                  <Pencil className="size-3.5" />
                </button>
                <button
                  type="button"
                  className="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                  onClick={(e) => handleDeleteClick(e, g)}
                  onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  aria-label="Delete group"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </span>
              <span className="text-muted-foreground text-xs pl-1">
                {g._count.bookmarks}
              </span>
            </DropdownMenuCheckboxItem>
          ))}
          <DropdownMenuSeparator />
          {groups.length > 1 && (
            <DropdownMenuItem onSelect={() => setReorderOpen(true)}>
              <List className="size-4" />
              Reorder groups
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            New Group
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <GroupReorderDialog
        groups={groups}
        onReorderEnd={handleReorderEnd}
        open={reorderOpen}
        onOpenChange={setReorderOpen}
      />
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
      <GroupFormDialog
        mode="edit"
        name={editName}
        color={editColor}
        onNameChange={setEditName}
        onColorChange={setEditColor}
        onSubmit={handleEditSave}
        onCancel={() => setEditingGroup(null)}
        open={editingGroup !== null}
        onOpenChange={(open) => !open && setEditingGroup(null)}
      />
      <GroupDeleteDialog
        group={deleteTarget}
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}
