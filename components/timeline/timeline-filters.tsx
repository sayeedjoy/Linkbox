"use client";

import { BookmarkHeroInput } from "@/components/bookmark-hero-input";
import { cn } from "@/lib/utils";

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
}) {
  return (
    <div className={cn("w-full", className)}>
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
  );
}
