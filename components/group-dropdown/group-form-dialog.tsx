"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ColorPicker } from "@/components/color";

export const GROUP_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
];

export function GroupFormDialog({
  mode,
  name,
  color,
  onNameChange,
  onColorChange,
  onSubmit,
  onCancel,
  open,
  onOpenChange,
}: {
  mode: "create" | "edit";
  name: string;
  color: string;
  onNameChange: (v: string) => void;
  onColorChange: (v: string) => void;
  onSubmit: () => void | Promise<void>;
  onCancel: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const submitLabel = mode === "create" ? "Create" : "Save";
  const id = mode === "create" ? "group-name" : "edit-group-name";
  const title = mode === "create" ? "New group" : "Edit group";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs p-0 gap-0 overflow-hidden sm:max-w-[18rem]">
        <DialogTitle className="sr-only">{title}</DialogTitle>

        <div className="rounded-lg bg-muted/50 p-2.5">
          {/* Color dot + name input row */}
          <div className="flex min-w-0 items-center gap-2.5">
            <div>
              <ColorPicker
                value={color || "#6b7280"}
                onChange={onColorChange}
                className="h-2.5 w-2.5 shrink-0 rounded-full transition-transform hover:scale-125 focus:outline-none"
              />
            </div>
            <input
              id={id}
              type="text"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSubmit()}
              placeholder="Group name"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              aria-label="Group name"
            />
          </div>

          {/* Actions row */}
          <div className="mt-2.5 flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onSubmit()}
              disabled={!name.trim()}
              className="rounded-md bg-foreground px-2.5 py-1 text-xs text-background transition-colors hover:bg-foreground/90 disabled:opacity-40"
            >
              {submitLabel}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}