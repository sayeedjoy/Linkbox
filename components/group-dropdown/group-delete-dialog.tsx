"use client";

import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import type { GroupWithCount } from "@/lib/types";

export function GroupDeleteDialog({
  group,
  open,
  onOpenChange,
  onConfirm,
}: {
  group: GroupWithCount | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
}) {
  return (
    <DeleteConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete group?"
      description={
        group
          ? `"${group.name}" will be removed. Bookmarks in this group will move to All Bookmarks.`
          : ""
      }
      onConfirm={onConfirm}
    />
  );
}
