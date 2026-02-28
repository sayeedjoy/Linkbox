"use client";

import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";

function MultiSelectIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      className={className}
    >
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M3 9v10.4c0 .56 0 .84.109 1.054a1 1 0 0 0 .437.437C3.76 21 4.04 21 4.598 21H15m2-13l-4 4l-2-2m-4 3.8V6.2c0-1.12 0-1.68.218-2.108c.192-.377.497-.682.874-.874C8.52 3 9.08 3 10.2 3h7.6c1.12 0 1.68 0 2.108.218a2 2 0 0 1 .874.874C21 4.52 21 5.08 21 6.2v7.6c0 1.12 0 1.68-.218 2.108a2 2 0 0 1-.874.874c-.428.218-.986.218-2.104.218h-7.607c-1.118 0-1.678 0-2.105-.218a2 2 0 0 1-.874-.874C7 15.48 7 14.92 7 13.8"
      />
    </svg>
  );
}

export function BookmarkStatusHeader({
  selectionMode,
  onSelectClick,
  onCancelSelect,
}: {
  selectionMode?: boolean;
  onSelectClick?: () => void;
  onCancelSelect?: () => void;
} = {}) {
  const showSelect = onSelectClick || onCancelSelect;
  return (
    <div className="hidden sm:grid grid-cols-[1fr_auto_1fr] gap-4 items-center px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
      <div className="shrink-0 justify-self-start flex items-center gap-2">
        {showSelect && (
          <button
            type="button"
            className={cn(
              "rounded-md p-1 transition-colors hover:bg-muted",
              selectionMode
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={selectionMode ? onCancelSelect : onSelectClick}
            aria-label={selectionMode ? "Cancel selection" : "Select bookmarks"}
          >
            <MultiSelectIcon className="size-[18px]" />
          </button>
        )}
        <span>TITLE</span>
      </div>
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
      <div className="justify-self-end">CREATED AT</div>
    </div>
  );
}
