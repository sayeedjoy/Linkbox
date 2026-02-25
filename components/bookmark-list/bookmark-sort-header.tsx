"use client";

import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";
import { Kbd } from "@/components/ui/kbd";

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
    <div className="hidden sm:grid grid-cols-[1fr_auto_1fr] gap-4 items-center px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
      <button
        type="button"
        className="flex items-center gap-1 hover:text-foreground shrink-0 justify-self-start"
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
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground/60 font-normal normal-case justify-self-center">
        <div className="flex items-center gap-1">
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd>
          <span>navigate</span>
        </div>
        <span className="text-muted-foreground/50">·</span>
        <div className="flex items-center gap-1">
          <Kbd>Space</Kbd>
          <span>preview</span>
        </div>
        <span className="text-muted-foreground/50">·</span>
        <div className="flex items-center gap-1">
          <Kbd>⏎</Kbd>
          <span>copy</span>
        </div>
        <span className="text-muted-foreground/50">·</span>
        <div className="flex items-center gap-1">
          <Kbd>⌘</Kbd>
          <Kbd>⏎</Kbd>
          <span>open</span>
        </div>
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
