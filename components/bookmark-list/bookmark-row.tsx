"use client";

import { forwardRef, useState, useRef, useEffect } from "react";
import { GripVertical, Pen, Copy, ArrowUpRight, Trash2, Check, RefreshCw } from "lucide-react";
import type { BookmarkWithGroup } from "@/app/actions/bookmarks";
import { formatDate, safeHostname } from "./utils";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

const COPIED_RESET_MS = 2000;

export const BookmarkRow = forwardRef<HTMLLIElement, {
  bookmark: BookmarkWithGroup;
  isFocused?: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onRefresh?: (id: string) => void;
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}>(({ bookmark, isFocused = false, onEdit, onDelete, onRefresh, selectionMode, isSelected, onToggleSelect }, ref) => {
  const [copied, setCopied] = useState(false);
  const imageToken = `${bookmark.id}:${bookmark.faviconUrl ?? ""}:${bookmark.url ?? ""}`;
  const [imageState, setImageState] = useState<{ token: string; broken: string | null }>({
    token: imageToken,
    broken: null,
  });
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hostname = bookmark.url ? safeHostname(bookmark.url) : "";
  const trimmedTitle = bookmark.title?.trim() ?? "";
  const trimmedDescription = bookmark.description?.trim() ?? "";
  const strippedUrl = bookmark.url
    ? bookmark.url.replace(/^https?:\/\//i, "").replace(/\/$/, "")
    : "";
  const displayTitle = trimmedTitle || hostname || strippedUrl || "Untitled";
  const displaySubtitle = hostname || strippedUrl || trimmedDescription.slice(0, 60) || "Note";
  const googleFaviconSrc = hostname
    ? `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(hostname)}`
    : null;
  const savedFaviconSrc =
    typeof bookmark.faviconUrl === "string" && bookmark.faviconUrl.trim()
      ? bookmark.faviconUrl.trim()
      : null;
  const faviconCandidates = [savedFaviconSrc, googleFaviconSrc].filter(
    (src): src is string => !!src,
  );
  const brokenImage = imageState.token === imageToken ? imageState.broken : null;
  const faviconSrc = faviconCandidates.find((src) => src !== brokenImage) ?? null;

  useEffect(() => () => {
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
  }, []);

  const handleCopy = async () => {
    try {
      if (bookmark.url) await navigator.clipboard.writeText(bookmark.url);
      else {
        const text = [bookmark.title, bookmark.description].filter(Boolean).join("\n");
        await navigator.clipboard.writeText(text || "");
      }
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      setCopied(true);
      copyTimeoutRef.current = setTimeout(() => {
        setCopied(false);
        copyTimeoutRef.current = null;
      }, COPIED_RESET_MS);
    } catch {}
  };

  return (
    <li
      ref={ref}
      id={`bookmark-row-${bookmark.id}`}
      aria-current={isFocused ? true : undefined}
      data-focused={isFocused ? "true" : undefined}
      draggable={!selectionMode}
      role={selectionMode ? "button" : undefined}
      tabIndex={selectionMode ? 0 : undefined}
      onClick={selectionMode && onToggleSelect ? () => onToggleSelect() : undefined}
      onKeyDown={selectionMode && onToggleSelect ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggleSelect(); } } : undefined}
      className={cn(
        "group relative min-w-0 flex flex-col gap-2 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted/50",
        !selectionMode && "cursor-grab active:cursor-grabbing",
        selectionMode && "cursor-pointer",
        isFocused && "bg-muted/50",
        selectionMode && isSelected && "ring-1 ring-primary ring-inset bg-muted/70",
        "sm:grid sm:grid-cols-[1fr_auto] sm:gap-4 sm:items-center sm:px-4"
      )}
    >
      {!selectionMode && (
        <span className="pointer-events-none absolute -left-6 top-1/2 hidden -translate-y-1/2 text-muted-foreground/50 opacity-0 transition-opacity sm:block sm:group-hover:opacity-100">
          <GripVertical className="size-4" />
        </span>
      )}

      <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:min-w-0">
        {selectionMode && (
          <div className="shrink-0" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
            <Checkbox checked={!!isSelected} onCheckedChange={() => onToggleSelect?.()} aria-label={isSelected ? "Deselect" : "Select"} />
          </div>
        )}
        {faviconSrc ? (
          <img
            src={faviconSrc}
            alt=""
            className="size-5 shrink-0 rounded-md"
            onError={() =>
              setImageState({ token: imageToken, broken: faviconSrc })
            }
          />
        ) : (
          <div className="size-5 shrink-0 rounded-md bg-muted" />
        )}
        <div className="min-w-0 flex-1">
          <div className="min-w-0 sm:flex sm:items-center sm:gap-2">
            {bookmark.url ? (
              <a
                href={bookmark.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block truncate text-sm font-medium text-foreground"
              >
                {displayTitle}
              </a>
            ) : (
              <span className="block truncate text-sm font-medium text-foreground">
                {displayTitle}
              </span>
            )}
            <span className="hidden truncate text-xs text-muted-foreground sm:block">
              {displaySubtitle}
            </span>
          </div>
          <div className="truncate text-xs text-muted-foreground sm:hidden">
            {displaySubtitle}
          </div>
        </div>
      </div>

      <div className="flex w-full shrink-0 items-center justify-between sm:relative sm:min-w-[10.5rem] sm:justify-end">
        <div className="text-xs text-muted-foreground sm:text-sm sm:transition-opacity sm:group-hover:opacity-0">
          {formatDate(bookmark.createdAt)}
        </div>

        <div className="flex items-center gap-1 sm:absolute sm:inset-0 sm:justify-end sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
          <button
            type="button"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={(e) => { e.stopPropagation(); onEdit(bookmark.id); }}
            aria-label="Edit"
          >
            <Pen className="size-4" />
          </button>

          <button
            type="button"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={(e) => { e.stopPropagation(); handleCopy(); }}
            aria-label={bookmark.url ? "Copy link" : "Copy note"}
          >
            {copied ? (
              <Check className="size-4 text-green-600 dark:text-green-500" />
            ) : (
              <Copy className="size-4" />
            )}
          </button>

          {bookmark.url ? (
            <a
              href={bookmark.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Open in new tab"
            >
              <ArrowUpRight className="size-4" />
            </a>
          ) : null}

          {bookmark.url ? (
            <button
              type="button"
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              onClick={(e) => { e.stopPropagation(); onRefresh?.(bookmark.id); }}
              aria-label="Refresh"
            >
              <RefreshCw className="size-4" />
            </button>
          ) : null}

          <button
            type="button"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            onClick={(e) => { e.stopPropagation(); onDelete(bookmark.id); }}
            aria-label="Delete"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>
    </li>
  );
});

BookmarkRow.displayName = "BookmarkRow";
