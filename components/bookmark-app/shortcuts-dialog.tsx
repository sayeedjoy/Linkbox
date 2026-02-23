"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
            <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">⌘F</kbd>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Move down</span>
            <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">j</kbd> or <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">↓</kbd>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Move up</span>
            <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">k</kbd> or <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">↑</kbd>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Open bookmark</span>
            <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">Enter</kbd>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Edit</span>
            <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">e</kbd>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Delete</span>
            <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">Backspace</kbd> / <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">Delete</kbd>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">This help</span>
            <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">?</kbd>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
