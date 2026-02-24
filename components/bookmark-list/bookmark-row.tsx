"use client";

import { forwardRef } from "react";
import {
  PencilIcon,
  CopyIcon,
  ExternalLinkIcon,
  TrashIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import type { BookmarkWithGroup } from "@/app/actions/bookmarks";
import { formatDate, safeHostname } from "./utils";

export const BookmarkRow = forwardRef<HTMLLIElement, {
  bookmark: BookmarkWithGroup;
  index: number;
  isFocused: boolean;
  onEdit: (id: string) => void;
  onPreview: (b: BookmarkWithGroup) => void;
  onDelete: (id: string) => void;
}>(({ bookmark, isFocused, onEdit, onPreview, onDelete }, ref) => {
  const handleCopy = async () => {
    if (bookmark.url) await navigator.clipboard.writeText(bookmark.url);
    else {
      const text = [bookmark.title, bookmark.description].filter(Boolean).join("\n");
      await navigator.clipboard.writeText(text || "");
    }
  };

  return (
    <li
      ref={ref}
      id={`bookmark-row-${bookmark.id}`}
      role="option"
      aria-selected={isFocused}
      className={`
        flex flex-col gap-1.5 p-3.5 rounded-xl border border-border bg-background
        sm:grid sm:grid-cols-[1fr_auto] sm:gap-4 sm:items-center sm:p-0 sm:py-3 sm:px-4
        sm:border-0 sm:rounded-none
        hover:bg-muted/20 group
        ${isFocused ? "bg-muted/40" : ""}
      `}
    >
      <div className="flex items-center gap-2.5 min-w-0 sm:flex-row sm:gap-3">
        {bookmark.faviconUrl ? (
          <img
            src={bookmark.faviconUrl}
            alt=""
            className="size-5 shrink-0 rounded"
          />
        ) : (
          <div className="size-5 shrink-0 rounded bg-muted" />
        )}
        <div className="min-w-0 flex-1">
          <div className="font-medium truncate leading-snug line-clamp-1">
            {bookmark.title || safeHostname(bookmark.url)}
          </div>
          <div className="text-xs text-muted-foreground truncate mt-0.5">
            {bookmark.url
              ? safeHostname(bookmark.url)
              : (bookmark.description?.slice(0, 60) ?? "Note")}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-1 sm:mt-0 sm:relative sm:justify-end">
        <div className="text-xs text-muted-foreground sm:transition-opacity sm:group-hover:opacity-0">
          {formatDate(bookmark.createdAt)}
        </div>
        <div className="flex items-center gap-0.5 sm:gap-1 opacity-100 sm:absolute sm:right-0 sm:inset-y-0 sm:items-center sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="size-8 sm:size-8"
            onClick={() => onEdit(bookmark.id)}
            aria-label="Edit"
          >
            <PencilIcon className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 sm:size-8"
            onClick={handleCopy}
            aria-label={bookmark.url ? "Copy URL" : "Copy note"}
          >
            <CopyIcon className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="hidden sm:inline-flex sm:size-8"
            onClick={() => onPreview(bookmark)}
            aria-label="Preview"
          >
            <Kbd>Space</Kbd>
          </Button>
          {bookmark.url ? (
            <a
              href={bookmark.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center size-8 sm:size-8 rounded-md hover:bg-muted"
              aria-label="Open in new tab"
            >
              <ExternalLinkIcon className="size-4" />
            </a>
          ) : null}
          <Button
            variant="ghost"
            size="icon"
            className="size-8 sm:size-8 text-destructive hover:text-destructive"
            onClick={() => onDelete(bookmark.id)}
            aria-label="Delete"
          >
            <TrashIcon className="size-4" />
          </Button>
        </div>
      </div>
    </li>
  );
});
