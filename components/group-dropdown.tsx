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
import { ChevronDownIcon, PlusIcon, GripVerticalIcon, PencilIcon, TrashIcon } from "lucide-react";
import { useCallback, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { createGroup, reorderGroups, updateGroup, deleteGroup } from "@/app/actions/groups";
import type { Group } from "@/app/generated/prisma/client";

type GroupWithCount = Group & { _count: { bookmarks: number } };

const GROUP_COLORS = [
  "#6b7280",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
];

function SortableGroupRow({
  group,
}: {
  group: GroupWithCount;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: group.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 rounded-lg border border-border p-2 bg-background ${isDragging ? "opacity-50 shadow-md" : ""}`}
    >
      <button
        type="button"
        className="touch-none p-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        <GripVerticalIcon className="size-4" />
      </button>
      <span
        className="size-3 rounded-full shrink-0"
        style={{ backgroundColor: group.color ?? "#6b7280" }}
      />
      <span className="truncate flex-1">{group.name}</span>
      <span className="text-xs text-muted-foreground">{group._count.bookmarks}</span>
    </div>
  );
}

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
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

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
      onGroupsChange();
      onSelectGroupId(newGroup.id);
      toast.success("Group created");
    } catch {
      toast.error("Failed to create group");
    }
  }, [newName, newColor, onGroupsChange, onSelectGroupId]);

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
            <ChevronDownIcon className="size-4 opacity-50" />
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
                  <PencilIcon className="size-3.5" />
                </button>
                <button
                  type="button"
                  className="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                  onClick={(e) => handleDeleteClick(e, g)}
                  onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  aria-label="Delete group"
                >
                  <TrashIcon className="size-3.5" />
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
              <GripVerticalIcon className="size-4" />
              Reorder groups
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={() => setCreateOpen(true)}>
            <PlusIcon className="size-4" />
            New Group
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={reorderOpen} onOpenChange={setReorderOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Reorder groups</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            {groups.length === 0 ? (
              <p className="text-sm text-muted-foreground">No groups to reorder.</p>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleReorderEnd}
              >
                <SortableContext
                  items={groups.map((g) => g.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="flex flex-col gap-2">
                    {groups.map((g) => (
                      <SortableGroupRow key={g.id} group={g} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New group</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <Label htmlFor="group-name">Name</Label>
            <Input
              id="group-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Group name"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <div className="flex gap-1 flex-wrap items-center">
              {GROUP_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="size-6 rounded-full border-2 border-transparent hover:border-foreground"
                  style={{ backgroundColor: c }}
                  onClick={() => setNewColor(c)}
                  aria-label={`Color ${c}`}
                />
              ))}
              <input
                type="color"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                className="size-6 rounded cursor-pointer border-0 w-6 h-6 p-0 bg-transparent"
                aria-label="Custom color"
              />
            </div>
          </div>
          <DialogFooter showCloseButton={false}>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!newName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={editingGroup !== null} onOpenChange={(open) => !open && setEditingGroup(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit group</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <Label htmlFor="edit-group-name">Name</Label>
            <Input
              id="edit-group-name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Group name"
              onKeyDown={(e) => e.key === "Enter" && handleEditSave()}
            />
            <div className="flex gap-1 flex-wrap items-center">
              {GROUP_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="size-6 rounded-full border-2 border-transparent hover:border-foreground"
                  style={{ backgroundColor: c }}
                  onClick={() => setEditColor(c)}
                  aria-label={`Color ${c}`}
                />
              ))}
              <input
                type="color"
                value={editColor}
                onChange={(e) => setEditColor(e.target.value)}
                className="size-6 rounded cursor-pointer border-0 w-6 h-6 p-0 bg-transparent"
                aria-label="Custom color"
              />
            </div>
          </div>
          <DialogFooter showCloseButton={false}>
            <Button variant="outline" onClick={() => setEditingGroup(null)}>
              Cancel
            </Button>
            <Button onClick={handleEditSave} disabled={!editName.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete group?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `"${deleteTarget.name}" will be removed. Bookmarks in this group will move to All Bookmarks.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={(e) => {
                e.preventDefault();
                handleDeleteConfirm();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
