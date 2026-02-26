"use client";

import { useState } from "react";
import { Star, MoreHorizontal, Pen, Copy, RefreshCw, Trash2 } from "lucide-react";
import type { Bookmark } from "./types";
import { safeHostname } from "./utils";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function TimelineCard({
  bookmark,
  animationDelay,
  onEdit,
  onRefresh,
  onDelete,
}: {
  bookmark: Bookmark;
  animationDelay?: number;
  onEdit?: (id: string) => void;
  onRefresh?: (id: string) => void;
  onDelete?: (id: string) => void;
}) {
  const [isFavorite, setIsFavorite] = useState(bookmark.isFavorite);
  const [faviconError, setFaviconError] = useState(false);
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
        "group border bg-card text-card-foreground transition-colors hover:bg-muted/50",
        animationDelay !== undefined && "animate-in fade-in slide-in-from-bottom-2 duration-300 [animation-fill-mode:both]"
      )}
      style={
        animationDelay !== undefined
          ? { animationDelay: `${animationDelay}ms` }
          : undefined
      }
    >
      <CardHeader className="flex flex-row items-start gap-3 pb-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
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
          <Badge variant="secondary" className="w-fit text-xs">
            {bookmark.category}
          </Badge>
        </div>
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => setIsFavorite((f) => !f)}
            aria-label={isFavorite ? "Unfavorite" : "Favorite"}
          >
            <Star
              className={cn("size-4", isFavorite && "fill-yellow-500 text-yellow-500")}
            />
          </Button>
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
              <DropdownMenuItem variant="destructive" onSelect={() => onDelete?.(bookmark.id)}>
                <Trash2 className="size-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
    </Card>
  );
}
