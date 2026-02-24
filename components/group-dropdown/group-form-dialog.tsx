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
import { ColorPicker } from "@/components/color";

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
          <div className="flex flex-wrap items-center gap-2">
            <Label className="shrink-0">Color</Label>
            {GROUP_COLORS.slice(0, 6).map((hex) => (
              <button
                key={hex}
                type="button"
                className="size-6 shrink-0 rounded-full border border-border shadow-sm transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                style={{ backgroundColor: hex }}
                onClick={() => onColorChange(hex)}
                aria-label={`Color ${hex}`}
              />
            ))}
            <ColorPicker
              value={color || "#6b7280"}
              onChange={onColorChange}
              className="size-6"
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
