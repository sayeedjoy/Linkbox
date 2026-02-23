"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const GROUP_COLORS = [
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
  const title = mode === "create" ? "New group" : "Edit group";
  const submitLabel = mode === "create" ? "Create" : "Save";
  const id = mode === "create" ? "group-name" : "edit-group-name";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-2 py-2">
          <Label htmlFor={id}>Name</Label>
          <Input
            id={id}
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Group name"
            onKeyDown={(e) => e.key === "Enter" && onSubmit()}
          />
          <div className="flex gap-1 flex-wrap items-center">
            {GROUP_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className="size-6 rounded-full border-2 border-transparent hover:border-foreground"
                style={{ backgroundColor: c }}
                onClick={() => onColorChange(c)}
                aria-label={`Color ${c}`}
              />
            ))}
            <input
              type="color"
              value={color}
              onChange={(e) => onColorChange(e.target.value)}
              className="size-6 rounded cursor-pointer border-0 w-6 h-6 p-0 bg-transparent"
              aria-label="Custom color"
            />
          </div>
          <DialogFooter showCloseButton={false}>
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={onSubmit} disabled={!name.trim()}>
              {submitLabel}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
