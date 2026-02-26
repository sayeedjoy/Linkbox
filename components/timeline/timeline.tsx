"use client";

import type { Bookmark } from "./types";
import { groupBookmarksByDate } from "./utils";
import { TimelineCard } from "./timeline-card";
import { cn } from "@/lib/utils";

interface TimelineProps {
  bookmarks: Bookmark[];
  onEdit?: (id: string) => void;
  onRefresh?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function Timeline({ bookmarks, onEdit, onRefresh, onDelete }: TimelineProps) {
  const groups = groupBookmarksByDate(bookmarks);
  const disableStaggeredAnimation = bookmarks.length > 200;
  let globalIndex = 0;

  return (
    <div className="w-full">
      {groups.map(({ label, items }) => (
        <section key={label} className="mb-8">
          <div
            className={cn(
              "sticky top-0 z-10 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground",
              "bg-background/80 backdrop-blur-sm"
            )}
          >
            {label}
          </div>
          <ul className="relative flex flex-col gap-0">
            <div
              className={cn(
                "absolute left-[11px] top-0 bottom-0 w-px bg-border hidden md:block"
              )}
              aria-hidden
            />
            {items.map((bookmark) => {
              const index = globalIndex++;
              const faviconSrc = bookmark.favicon;
              const animationDelay = disableStaggeredAnimation ? undefined : index * 50;

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
                      animationDelay={animationDelay}
                      onEdit={onEdit}
                      onRefresh={onRefresh}
                      onDelete={onDelete}
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
