"use client";

import { ArrowDownIcon, ArrowUpIcon, CopyIcon, ExternalLinkIcon } from "lucide-react";

export function BookmarkSortHeader({
  sortKey,
  sortOrder,
  onSortChange,
}: {
  sortKey: "createdAt" | "title";
  sortOrder: "asc" | "desc";
  onSortChange: (key: "createdAt" | "title", order: "asc" | "desc") => void;
}) {
  return (
    <div className="hidden sm:grid grid-cols-[auto_1fr_auto] gap-4 items-center px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
      <button
        type="button"
        className="flex items-center gap-1 hover:text-foreground"
        onClick={() =>
          onSortChange(
            "title",
            sortKey === "title" && sortOrder === "asc" ? "desc" : "asc",
          )
        }
      >
        TITLE
        {sortKey === "title" ? (
          sortOrder === "asc" ? (
            <ArrowUpIcon className="size-3" />
          ) : (
            <ArrowDownIcon className="size-3" />
          )
        ) : null}
      </button>
      <div className="hidden sm:flex items-center gap-3 text-muted-foreground font-normal normal-case justify-self-center">
        <span className="flex items-center gap-1">
          <ArrowUpIcon className="size-3" />
          <ArrowDownIcon className="size-3" />
          navigate
        </span>
        <span className="flex items-center gap-1">
          <span className="rounded px-1.5 py-0.5 bg-muted/50 text-xs">
            Space
          </span>
          preview
        </span>
        <span className="flex items-center gap-1">
          <CopyIcon className="size-3" />
          copy
        </span>
        <span className="flex items-center gap-1">
          <ExternalLinkIcon className="size-3" />
          open
        </span>
      </div>
      <button
        type="button"
        className="flex items-center gap-1 hover:text-foreground justify-self-end"
        onClick={() =>
          onSortChange(
            "createdAt",
            sortKey === "createdAt" && sortOrder === "asc" ? "desc" : "asc",
          )
        }
      >
        CREATED AT
        {sortKey === "createdAt" ? (
          sortOrder === "asc" ? (
            <ArrowUpIcon className="size-3" />
          ) : (
            <ArrowDownIcon className="size-3" />
          )
        ) : null}
      </button>
    </div>
  );
}
