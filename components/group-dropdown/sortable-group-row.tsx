"use client";

import { GripVerticalIcon } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { GroupWithCount } from "@/lib/types";

export function SortableGroupRow({ group }: { group: GroupWithCount }) {
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
        <GripVerticalIcon size={16} className="text-muted-foreground shrink-0" style={{ color: "var(--muted-foreground, #374151)" }} />
      </button>
      <span
        className="size-3 rounded-full shrink-0"
        style={{ backgroundColor: group.color ?? "#6b7280", width: 12, height: 12 }}
      />
      <span className="truncate flex-1">{group.name}</span>
      <span className="text-xs text-muted-foreground">{group._count.bookmarks}</span>
    </div>
  );
}
