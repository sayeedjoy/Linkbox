"use client";

import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { BookmarkHeroInput } from "@/components/bookmark-hero-input";
import { cn } from "@/lib/utils";

const SORT_OPTIONS: { value: TimelineSort; label: string }[] = [
  { value: "date-desc", label: "Date" },
  { value: "name-asc", label: "Name" },
];

type TimelineSort = "date-desc" | "name-asc";

export function TimelineFilters({
  className,
  inputValue,
  onInputChange,
  onSubmit,
  onPaste,
  searchMode,
  onSearchModeChange,
  search,
  onSearchChange,
  sortBy,
  onSortChange,
}: {
  className?: string;
  inputValue: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  onPaste?: (text: string, files: FileList | null) => void;
  searchMode?: boolean;
  onSearchModeChange?: (mode: boolean) => void;
  search: string;
  onSearchChange: (value: string) => void;
  sortBy: TimelineSort;
  onSortChange: (value: TimelineSort) => void;
}) {
  const handleSortChange = useCallback(
    (value: TimelineSort) => {
      onSortChange(value);
    },
    [onSortChange]
  );

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center gap-3">
        <div className="flex-1 w-full">
          <BookmarkHeroInput
            value={searchMode ? search : inputValue}
            onChange={searchMode ? onSearchChange : onInputChange}
            onSubmit={onSubmit}
            onPaste={onPaste}
            searchMode={searchMode}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "f") {
                e.preventDefault();
                onSearchModeChange?.(!searchMode);
                if (!searchMode) {
                  onSearchChange("");
                } else {
                  onInputChange("");
                }
              }
            }}
            placeholder="Paste a link, image, or text..."
            searchPlaceholder="Search bookmarks..."
          />
        </div>

        <div className="flex items-center gap-1">
          {SORT_OPTIONS.map((option) => (
            <Button
              key={option.value}
              variant={sortBy === option.value ? "secondary" : "ghost"}
              size="sm"
              onClick={() => handleSortChange(option.value)}
              className="text-muted-foreground"
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
