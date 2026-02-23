"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDownIcon, PlusIcon, CircleIcon } from "lucide-react";
import { useCallback, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createGroup } from "@/app/actions/groups";
import type { Group } from "@/app/generated/prisma/client";

type GroupWithCount = Group & { _count: { bookmarks: number } };

const GROUP_COLORS = [
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

export function GroupDropdown({
  groups,
  selectedGroupId,
  onSelectGroupId,
  onGroupsChange,
}: {
  groups: GroupWithCount[];
  selectedGroupId: string | null;
  onSelectGroupId: (id: string | null) => void;
  onGroupsChange: () => void;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(GROUP_COLORS[0]);

  const handleCreate = useCallback(async () => {
    const name = newName.trim();
    if (!name) return;
    await createGroup(name, newColor);
    setNewName("");
    setCreateOpen(false);
    onGroupsChange();
  }, [newName, newColor, onGroupsChange]);

  const label =
    selectedGroupId === null
      ? "All Bookmarks"
      : groups.find((g) => g.id === selectedGroupId)?.name ?? "All Bookmarks";
  const totalCount = groups.reduce((s, g) => s + g._count.bookmarks, 0);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-1 font-normal">
            <CircleIcon className="size-3 fill-foreground" />
            <span className="max-w-[140px] truncate">{label}</span>
            <ChevronDownIcon className="size-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[200px]">
          <DropdownMenuItem onSelect={() => onSelectGroupId(null)}>
            <CircleIcon className="size-3 fill-foreground mr-2" />
            All Bookmarks
            <span className="ml-auto text-muted-foreground text-xs">
              {totalCount}
            </span>
          </DropdownMenuItem>
          {groups.length > 0 && <DropdownMenuSeparator />}
          {groups.map((g) => (
            <DropdownMenuItem
              key={g.id}
              onSelect={() => onSelectGroupId(g.id)}
            >
              <span
                className="size-3 rounded-full mr-2 shrink-0"
                style={{ backgroundColor: g.color ?? "#6b7280" }}
              />
              <span className="truncate">{g.name}</span>
              <span className="ml-auto text-muted-foreground text-xs">
                {g._count.bookmarks}
              </span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setCreateOpen(true)}>
            <PlusIcon className="size-4" />
            Create group
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New group</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <Label htmlFor="group-name">Name</Label>
            <Input
              id="group-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Group name"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <div className="flex gap-1 flex-wrap">
              {GROUP_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="size-6 rounded-full border-2 border-transparent hover:border-foreground"
                  style={{ backgroundColor: c }}
                  onClick={() => setNewColor(c)}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
          </div>
          <DialogFooter showCloseButton={false}>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!newName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
