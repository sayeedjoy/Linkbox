"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { BookmarkWithGroup } from "@/app/actions/bookmarks";
import { hostnameFromUrl } from "./utils";

export function PreviewDialog({
  bookmark,
  open,
  onOpenChange,
}: {
  bookmark: BookmarkWithGroup | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90dvh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="truncate pr-8">
            {bookmark
              ? (bookmark.title || (bookmark.url ? hostnameFromUrl(bookmark.url) : "Note"))
              : ""}
          </DialogTitle>
        </DialogHeader>
        {bookmark && (
          <div className="space-y-3 overflow-y-auto min-h-0 flex-1">
            {bookmark.previewImageUrl && (
              <img
                src={bookmark.previewImageUrl}
                alt=""
                className="w-full rounded-lg border border-border object-cover max-h-48"
              />
            )}
            {bookmark.description && (
              <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                {bookmark.description}
              </p>
            )}
            {bookmark.url ? (
              <>
                <a
                  href={bookmark.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-foreground truncate block"
                >
                  {bookmark.url}
                </a>
                <Button asChild size="sm">
                  <a href={bookmark.url} target="_blank" rel="noopener noreferrer">
                    Open
                  </a>
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                onClick={() => {
                  const text = [bookmark.title, bookmark.description].filter(Boolean).join("\n");
                  navigator.clipboard.writeText(text || "");
                }}
              >
                Copy
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
