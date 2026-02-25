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

export const GROUP_COLORS = ["#6b7280"];

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
            <ColorPicker
              value={color || "#6b7280"}
              onChange={onColorChange}
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
