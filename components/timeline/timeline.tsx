"use client";

import { useCallback } from "react";
import type { Bookmark } from "./types";
import { groupBookmarksByDate } from "./utils";
import { TimelineCard } from "./timeline-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SORT_OPTIONS: { value: TimelineSort; label: string }[] = [
  { value: "date-desc", label: "Date" },
  { value: "name-asc", label: "Name" },
];

type TimelineSort = "date-desc" | "name-asc";

interface TimelineProps {
  bookmarks: Bookmark[];
  onEdit?: (id: string) => void;
  onRefresh?: (id: string) => void;
  onDelete?: (id: string) => void;
  sortBy: TimelineSort;
  onSortChange: (value: TimelineSort) => void;
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onSelectClick?: () => void;
}

export function Timeline({ bookmarks, onEdit, onRefresh, onDelete, sortBy, onSortChange, selectionMode, selectedIds, onToggleSelect, onSelectClick }: TimelineProps) {
  const groups = groupBookmarksByDate(bookmarks);

  const handleSortChange = useCallback(
    (value: TimelineSort) => {
      onSortChange(value);
    },
    [onSortChange]
  );

  return (
    <div className="w-full">
      {groups.map(({ label, items }, groupIndex) => (
        <section key={label} className="mb-8">
          <div
            className={cn(
              "sticky top-0 z-10 py-2 flex items-center justify-between text-xs font-medium uppercase tracking-wide text-muted-foreground",
              "bg-background/80 backdrop-blur-sm -mx-4 px-4 sm:-mx-6 sm:px-6"
            )}
          >
            <span>{label}</span>
            {groupIndex === 0 && (
              <div className="flex items-center gap-1">
                {SORT_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    variant={sortBy === option.value ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => handleSortChange(option.value)}
                    className="text-muted-foreground h-6 px-2 text-xs"
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
          <ul className="relative flex flex-col gap-0">
            <div
              className={cn(
                "absolute left-[11px] top-0 bottom-0 w-px bg-border hidden md:block"
              )}
              aria-hidden
            />
            {items.map((bookmark) => {
              const faviconSrc = bookmark.favicon;

              return (
                <li
                  key={bookmark.id}
                  className="relative flex items-stretch pl-0 md:pl-6"
                >
                  <div
                    className={cn(
                      "absolute left-[3px] top-6 hidden size-4 shrink-0 overflow-hidden rounded-full border-2 border-background bg-card ring-1 ring-border md:block",
                      "z-[2]"
                    )}
                    aria-hidden
                  >
                    {faviconSrc ? (
                      <img
                        src={faviconSrc}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      <div className="size-full bg-muted" />
                    )}
                  </div>
                  <div
                    className={cn(
                      "absolute left-[11px] top-6 hidden h-px w-3 bg-border md:block",
                      "z-[1]"
                    )}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1 pt-2 pb-4 pl-0 md:pl-2">
                    <TimelineCard
                      bookmark={bookmark}
                      onEdit={onEdit}
                      onRefresh={onRefresh}
                      onDelete={onDelete}
                      selectionMode={selectionMode}
                      isSelected={selectedIds?.has(bookmark.id)}
                      onToggleSelect={onToggleSelect ? () => onToggleSelect(bookmark.id) : undefined}
                      onSelectClick={onSelectClick}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
