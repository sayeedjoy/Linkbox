"use client";

import { forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BookmarkWithGroup } from "@/app/actions/bookmarks";

type EditForm = {
  title: string;
  description: string;
  url: string;
  groupId: string | null;
};

export const BookmarkEditCard = forwardRef<HTMLLIElement, {
  bookmark: BookmarkWithGroup;
  groups: { id: string; name: string; color: string | null }[];
  editForm: EditForm;
  onEditFormChange: (form: EditForm) => void;
  onSave: () => void;
  onCancel: () => void;
}>(({ bookmark, groups, editForm, onEditFormChange, onSave, onCancel }, ref) => (
    <li
      ref={ref}
      id={`bookmark-row-${bookmark.id}`}
      className="rounded-2xl border border-border bg-background overflow-hidden p-4 sm:p-5 flex flex-col gap-4"
    >
      <div className="flex items-center gap-3 min-w-0">
        {bookmark.faviconUrl ? (
          <img
            src={bookmark.faviconUrl}
            alt=""
            className="size-6 shrink-0 rounded"
          />
        ) : (
          <div className="size-6 shrink-0 rounded bg-muted" />
        )}
        <Input
          value={editForm.title}
          onChange={(e) =>
            onEditFormChange({ ...editForm, title: e.target.value })
          }
          placeholder="Title"
          className="min-w-0 flex-1 border-0 px-0 h-auto text-base font-medium focus-visible:ring-0 focus-visible:ring-offset-0"
        />
      </div>
      <Input
        value={editForm.url}
        onChange={(e) =>
          onEditFormChange({ ...editForm, url: e.target.value })
        }
        placeholder="URL"
        className="text-muted-foreground text-sm"
      />
      <Textarea
        value={editForm.description}
        onChange={(e) =>
          onEditFormChange({ ...editForm, description: e.target.value })
        }
        placeholder="Description"
        rows={3}
        className="min-h-20 resize-none"
      />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Select
          value={editForm.groupId ?? "none"}
          onValueChange={(v) =>
            onEditFormChange({
              ...editForm,
              groupId: v === "none" ? null : v,
            })
          }
        >
          <SelectTrigger className="w-fit bg-muted/50 hover:bg-muted/70 border-0 rounded-full px-3 py-2 h-auto">
            <SelectValue placeholder="No group" />
          </SelectTrigger>
          <SelectContent side="bottom">
            <SelectItem value="none">
              <span
                className="size-2.5 rounded-full shrink-0 mr-2 inline-block"
                style={{ backgroundColor: "#6b7280" }}
              />
              No group
            </SelectItem>
            {groups.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                <span
                  className="size-2.5 rounded-full shrink-0 mr-2 inline-block"
                  style={{ backgroundColor: g.color ?? "#6b7280" }}
                />
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onSave}>Save</Button>
        </div>
      </div>
    </li>
  ));
