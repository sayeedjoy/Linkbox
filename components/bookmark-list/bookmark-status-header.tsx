"use client";

import { Kbd } from "@/components/ui/kbd";

export function BookmarkStatusHeader() {
  return (
    <div className="hidden sm:grid grid-cols-[1fr_auto_1fr] gap-4 items-center px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
      <div className="shrink-0 justify-self-start flex items-center gap-2">
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

