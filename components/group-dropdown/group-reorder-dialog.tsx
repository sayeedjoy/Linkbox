"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableGroupRow } from "./sortable-group-row";
import type { GroupWithCount } from "@/lib/types";

export function GroupReorderDialog({
  groups,
  onReorderEnd,
  open,
  onOpenChange,
}: {
  groups: GroupWithCount[];
  onReorderEnd: (event: DragEndEvent) => void | Promise<void>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
              onDragEnd={onReorderEnd}
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
  );
}
