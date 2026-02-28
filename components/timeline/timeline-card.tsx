"use client";

import { useState } from "react";
import { MoreHorizontal, Pen, Copy, RefreshCw, Trash2 } from "lucide-react";
import type { Bookmark } from "./types";

function MultiSelectIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" className={className}>
      <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9v10.4c0 .56 0 .84.109 1.054a1 1 0 0 0 .437.437C3.76 21 4.04 21 4.598 21H15m2-13l-4 4l-2-2m-4 3.8V6.2c0-1.12 0-1.68.218-2.108c.192-.377.497-.682.874-.874C8.52 3 9.08 3 10.2 3h7.6c1.12 0 1.68 0 2.108.218a2 2 0 0 1 .874.874C21 4.52 21 5.08 21 6.2v7.6c0 1.12 0 1.68-.218 2.108a2 2 0 0 1-.874.874c-.428.218-.986.218-2.104.218h-7.607c-1.118 0-1.678 0-2.105-.218a2 2 0 0 1-.874-.874C7 15.48 7 14.92 7 13.8"/>
    </svg>
  );
}
import { safeHostname } from "./utils";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export function TimelineCard({
  bookmark,
  onEdit,
  onRefresh,
  onDelete,
  selectionMode,
  isSelected,
  onToggleSelect,
  onSelectClick,
}: {
  bookmark: Bookmark;
  onEdit?: (id: string) => void;
  onRefresh?: (id: string) => void;
  onDelete?: (id: string) => void;
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  onSelectClick?: () => void;
}) {
  const [faviconError, setFaviconError] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const domain = safeHostname(bookmark.url);
  const faviconSrc = bookmark.favicon && !faviconError ? bookmark.favicon : null;
  const hasUrl = Boolean(bookmark.url?.trim());
  const displayTitle = bookmark.title?.trim() || domain || "Untitled";

  const handleCopyLink = async () => {
    if (!bookmark.url) return;
    try {
      await navigator.clipboard.writeText(bookmark.url);
    } catch {}
  };

  return (
    <Card
      className={cn(
        "group transition-colors hover:bg-muted/50",
        selectionMode && "cursor-pointer",
        selectionMode && isSelected && "ring-1 ring-primary bg-muted/70"
      )}
      role={selectionMode ? "button" : undefined}
      tabIndex={selectionMode ? 0 : undefined}
      onClick={selectionMode && onToggleSelect ? () => onToggleSelect() : undefined}
      onKeyDown={selectionMode && onToggleSelect ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggleSelect(); } } : undefined}
    >
      <CardHeader className="flex flex-row items-start gap-3 pb-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
        {selectionMode && (
          <div className="flex items-center gap-2 mb-1" onClick={(e) => e.stopPropagation()}>
            <Checkbox checked={!!isSelected} onCheckedChange={() => onToggleSelect?.()} aria-label={isSelected ? "Deselect" : "Select"} />
          </div>
        )}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {faviconSrc ? (
              <img
                src={faviconSrc}
                alt=""
                className="size-4 shrink-0 rounded-full"
                onError={() => setFaviconError(true)}
              />
            ) : (
              <div className="size-4 shrink-0 rounded-full bg-muted" />
            )}
            <span className="truncate">{hasUrl ? domain || "Link" : "Note"}</span>
          </div>
          <CardTitle className="text-base font-semibold leading-tight">
            {hasUrl ? (
              <a
                href={bookmark.url ?? "#"}
                target="_blank"
                rel="noopener"
                className="text-foreground hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {displayTitle}
              </a>
            ) : (
              <span className="text-foreground">{displayTitle}</span>
            )}
          </CardTitle>
          {bookmark.description ? (
            <CardDescription className="line-clamp-2 text-muted-foreground">
              {bookmark.description}
            </CardDescription>
          ) : null}
          <Badge variant="secondary" className="mt-1 w-fit gap-1.5 text-xs">
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: bookmark.categoryColor ?? "#6b7280" }}
              aria-hidden
            />
            {bookmark.category}
          </Badge>
        </div>
        <div className="flex shrink-0 items-center gap-0.5 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8" aria-label="More options">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[160px]">
              <DropdownMenuItem onSelect={() => onEdit?.(bookmark.id)}>
                <Pen className="size-4" />
                Edit
              </DropdownMenuItem>
              {hasUrl && (
                <>
                  <DropdownMenuItem onSelect={handleCopyLink}>
                    <Copy className="size-4" />
                    Copy link
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => onRefresh?.(bookmark.id)}>
                    <RefreshCw className="size-4" />
                    Refresh
                  </DropdownMenuItem>
                </>
              )}
              {onSelectClick && !selectionMode && (
                <DropdownMenuItem onSelect={() => { onSelectClick(); onToggleSelect?.(); }}>
                  <MultiSelectIcon className="size-4" />
                  Select
                </DropdownMenuItem>
              )}
              <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(true)}>
                <Trash2 className="size-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete bookmark?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this bookmark.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => onDelete?.(bookmark.id)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
