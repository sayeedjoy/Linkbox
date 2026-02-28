"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Group = { id: string; name: string; color: string | null };

export function MoveToGroupDialog({
  open,
  onOpenChange,
  groups,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: Group[];
  onConfirm: (groupId: string | null) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | "none">("none");

  const handleConfirm = () => {
    const groupId = selectedId === "none" ? null : selectedId;
    onConfirm(groupId);
    onOpenChange(false);
    setSelectedId("none");
  };

  const handleOpenChange = (next: boolean) => {
    if (next) setSelectedId("none");
    else setSelectedId("none");
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>Move to group</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-1 py-2 max-h-56 overflow-y-auto">
          <button
            type="button"
            onClick={() => setSelectedId("none")}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-muted",
              selectedId === "none" && "bg-muted"
            )}
          >
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: "#6b7280" }}
              aria-hidden
            />
            No group
          </button>
          {groups.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setSelectedId(g.id)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-muted",
                selectedId === g.id && "bg-muted"
              )}
            >
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: g.color ?? "#6b7280" }}
                aria-hidden
              />
              {g.name}
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>Move</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
