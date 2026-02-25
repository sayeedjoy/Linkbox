"use client";

import { useState, memo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { BookmarkWithGroup } from "@/app/actions/bookmarks";
import { hostnameFromUrl } from "./utils";
import { cn } from "@/lib/utils";

const PreviewBody = memo(function PreviewBody({
  bookmark,
}: {
  bookmark: BookmarkWithGroup;
}) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const title =
    bookmark.title || (bookmark.url ? hostnameFromUrl(bookmark.url) : "Note");

  return (
    <>
      <DialogHeader>
        <DialogTitle className="break-words pr-8">{title}</DialogTitle>
      </DialogHeader>
      <div
        className="space-y-3 overflow-y-auto min-h-0 flex-1"
        style={{ contentVisibility: "auto" } as React.CSSProperties}
      >
        {bookmark.previewImageUrl ? (
          <div className="min-h-[8rem] w-full rounded-lg border border-border overflow-hidden bg-muted/30 shrink-0">
            <img
              src={bookmark.previewImageUrl}
              alt=""
              decoding="async"
              fetchPriority="high"
              className={cn(
                "w-full h-full max-h-48 object-cover transition-opacity duration-150 ease-out",
                imageLoaded ? "opacity-100" : "opacity-0"
              )}
              onLoad={() => setImageLoaded(true)}
            />
          </div>
        ) : null}
        {bookmark.description ? (
          <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap">
            {bookmark.description}
          </p>
        ) : null}
        {bookmark.url ? (
          <>
            <a
              href={bookmark.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground block break-all"
            >
              {bookmark.url}
            </a>
            <Button asChild size="sm" className="min-h-9 touch-manipulation">
              <a href={bookmark.url} target="_blank" rel="noopener noreferrer">
                Open
              </a>
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            className="min-h-9 touch-manipulation"
            onClick={() => {
              const text = [bookmark.title, bookmark.description]
                .filter(Boolean)
                .join("\n");
              navigator.clipboard.writeText(text || "");
            }}
          >
            Copy
          </Button>
        )}
      </div>
    </>
  );
});

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
      <DialogContent
        className={cn(
          "w-[calc(100%-2rem)] max-w-md max-h-[90dvh] overflow-hidden flex flex-col",
          "duration-150 data-open:duration-150 data-closed:duration-100 ease-out",
          "sm:max-w-md p-4 sm:p-5 gap-3 sm:gap-4"
        )}
      >
        {bookmark ? (
          <PreviewBody key={bookmark.id} bookmark={bookmark} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
