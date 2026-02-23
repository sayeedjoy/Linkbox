"use client";

import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDownIcon, PlusIcon, CircleIcon, GripVerticalIcon } from "lucide-react";
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
import { createGroup, reorderGroups } from "@/app/actions/groups";
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
  selectedGroupId,
  onSelectGroupId,
  onGroupsChange,
}: {
  groups: GroupWithCount[];
  selectedGroupId: string | null;
  onSelectGroupId: (id: string | null) => void;
  onGroupsChange: () => void;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [reorderOpen, setReorderOpen] = useState(false);
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
  const totalCount = groups.reduce((s, g) => s + g._count.bookmarks, 0);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-1 font-normal">
            <CircleIcon className="size-3 fill-foreground" />
            <span className="max-w-[140px] truncate">{label}</span>
            <ChevronDownIcon className="size-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[200px]">
          <DropdownMenuItem onSelect={() => onSelectGroupId(null)}>
            <CircleIcon className="size-3 fill-foreground mr-2" />
            All Bookmarks
            <span className="ml-auto text-muted-foreground text-xs">
              {totalCount}
            </span>
          </DropdownMenuItem>
          {groups.length > 0 && <DropdownMenuSeparator />}
          {groups.map((g) => (
            <DropdownMenuItem
              key={g.id}
              onSelect={() => onSelectGroupId(g.id)}
            >
              <span
                className="size-3 rounded-full mr-2 shrink-0"
                style={{ backgroundColor: g.color ?? "#6b7280" }}
              />
              <span className="truncate">{g.name}</span>
              <span className="ml-auto text-muted-foreground text-xs">
                {g._count.bookmarks}
              </span>
            </DropdownMenuItem>
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
            Create group
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
            <div className="flex gap-1 flex-wrap">
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
    </>
  );
}
