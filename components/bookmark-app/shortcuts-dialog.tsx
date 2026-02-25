"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";

export function ShortcutsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
        </DialogHeader>
        <div className="grid gap-2 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Search</span>
            <Kbd>⌘F</Kbd>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Move down</span>
            <span className="flex items-center gap-1">
              <Kbd>j</Kbd> or <Kbd>↓</Kbd>
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Move up</span>
            <span className="flex items-center gap-1">
              <Kbd>k</Kbd> or <Kbd>↑</Kbd>
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Open bookmark</span>
            <Kbd>Enter</Kbd>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Edit</span>
            <Kbd>e</Kbd>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Delete</span>
            <span className="flex items-center gap-1">
              <Kbd>Backspace</Kbd> / <Kbd>Delete</Kbd>
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">This help</span>
            <Kbd>?</Kbd>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
