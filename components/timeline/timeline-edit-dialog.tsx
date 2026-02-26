"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateBookmark } from "@/app/actions/bookmarks";
import { createGroup } from "@/app/actions/groups";
import { ColorPicker } from "@/components/color";
import { toast } from "sonner";
import type { Bookmark } from "./types";
import type { GroupWithCount } from "@/lib/types";
import { cn } from "@/lib/utils";

const DEFAULT_GROUP_COLOR = "#6b7280";

export function TimelineEditDialog({
  bookmark,
  groups,
  open,
  onOpenChange,
  onSaved,
  onGroupsChange,
}: {
  bookmark: Bookmark | null;
  groups: GroupWithCount[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  onGroupsChange: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [groupId, setGroupId] = useState<string | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupColor, setNewGroupColor] = useState(DEFAULT_GROUP_COLOR);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (bookmark) {
      setTitle(bookmark.title ?? "");
      setDescription(bookmark.description ?? "");
      setUrl(bookmark.url ?? "");
      setGroupId(bookmark.groupId ?? null);
    }
  }, [bookmark]);

  const handleSave = async () => {
    if (!bookmark) return;
    setSaving(true);
    try {
      await updateBookmark(bookmark.id, {
        title: title.trim() || null,
        description: description.trim() || null,
        url: url.trim() || null,
        groupId,
      });
      onSaved();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const selectedGroup = groupId ? groups.find((g) => g.id === groupId) : null;
  const selectedGroupLabel = selectedGroup?.name ?? "No group";
  const selectedGroupColor = selectedGroup?.color ?? DEFAULT_GROUP_COLOR;

  const handleCreateGroup = async () => {
    const name = newGroupName.trim();
    if (!name) return;
    setCreatingGroup(true);
    try {
      const created = await createGroup(name, newGroupColor || DEFAULT_GROUP_COLOR);
      setGroupId(created.id);
      setShowCreateGroup(false);
      setNewGroupName("");
      setNewGroupColor(DEFAULT_GROUP_COLOR);
      onGroupsChange();
      toast.success("Category created");
    } catch {
      toast.error("Failed to create category");
    } finally {
      setCreatingGroup(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>Edit bookmark</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="edit-title">Title</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
              className="w-full"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-url">URL</Label>
            <Input
              id="edit-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="w-full"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-description">Description</Label>
            <textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description"
              rows={3}
              className={cn(
                "flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm ring-offset-background",
                "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              )}
            />
          </div>
          <div className="grid gap-2">
            <Label>Group</Label>
            <Select
              value={groupId ?? "none"}
              onValueChange={(v) => setGroupId(v === "none" ? null : v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="No group">
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: selectedGroupColor }}
                    />
                    <span className="truncate">{selectedGroupLabel}</span>
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <span className="flex items-center gap-2">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: DEFAULT_GROUP_COLOR }}
                    />
                    <span>No group</span>
                  </span>
                </SelectItem>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    <span className="flex items-center gap-2">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: g.color ?? DEFAULT_GROUP_COLOR }}
                      />
                      <span>{g.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!showCreateGroup ? (
              <button
                type="button"
                className="w-fit text-xs text-muted-foreground underline-offset-4 hover:underline"
                onClick={() => setShowCreateGroup(true)}
              >
                + New category
              </button>
            ) : (
              <div className="rounded-lg border border-border bg-muted/30 p-2">
                <div className="flex items-center gap-2">
                  <ColorPicker
                    value={newGroupColor}
                    onChange={setNewGroupColor}
                    aria-label="New category color"
                  />
                  <Input
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="Category name"
                    className="h-8"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleCreateGroup();
                      }
                    }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowCreateGroup(false);
                      setNewGroupName("");
                      setNewGroupColor(DEFAULT_GROUP_COLOR);
                    }}
                    disabled={creatingGroup}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleCreateGroup}
                    disabled={!newGroupName.trim() || creatingGroup}
                  >
                    {creatingGroup ? "Creating..." : "Create"}
                  </Button>
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
