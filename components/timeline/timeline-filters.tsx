"use client";

import { useCallback, useState } from "react";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { PlusIcon, Search, Loader, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { createBookmark } from "@/app/actions/bookmarks";
import { cn } from "@/lib/utils";

const SORT_PARAMS: { value: TimelineSort; label: string }[] = [
  { value: "date-desc", label: "Date added" },
  { value: "name-asc", label: "Name" },
];

type TimelineSort = "date-desc" | "name-asc";

export function TimelineFilters({
  className,
  search,
  onSearchChange,
  sortBy,
  onSortChange,
}: {
  className?: string;
  search: string;
  onSearchChange: (value: string) => void;
  sortBy: TimelineSort;
  onSortChange: (value: TimelineSort) => void;
}) {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const userId = session?.user?.id ?? null;
  const [pasteValue, setPasteValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text")?.trim();
    if (text && (text.startsWith("http://") || text.startsWith("https://"))) {
      e.preventDefault();
      setPasteValue(text);
    }
  }, []);

  const handlePasteSubmit = useCallback(async () => {
    const raw = pasteValue.trim();
    if (!raw || !raw.startsWith("http")) return;
    setPasteValue("");
    setIsSubmitting(true);
    try {
      await createBookmark(raw);
      if (userId) {
        queryClient.invalidateQueries({ queryKey: ["bookmarks", userId] });
        queryClient.invalidateQueries({ queryKey: ["groups", userId] });
      }
      toast.success("Bookmark added");
    } catch {
      toast.error("Failed to add bookmark");
    } finally {
      setIsSubmitting(false);
    }
  }, [pasteValue, queryClient, userId]);

  const handleSortChange = useCallback(
    (value: string) => {
      onSortChange(value as TimelineSort);
    },
    [onSortChange]
  );
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="p-0">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3 md:items-center">
          <div className="flex min-w-0 items-center gap-1 rounded-md border bg-background px-1.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0"
              aria-label="Add bookmark"
              disabled={isSubmitting}
              onClick={handlePasteSubmit}
            >
              {isSubmitting ? (
                <Loader className="size-4 animate-spin" />
              ) : (
                <PlusIcon className="size-4" />
              )}
            </Button>
            <Input
              type="text"
              value={pasteValue}
              onChange={(e) => setPasteValue(e.target.value)}
              onPaste={handlePaste}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handlePasteSubmit();
                }
              }}
              placeholder="Paste a link..."
              className="min-w-0 border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
              autoComplete="off"
              aria-label="Paste link"
              disabled={isSubmitting}
            />
            {pasteValue.trim().length > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
                aria-label="Clear pasted link"
                onClick={() => setPasteValue("")}
                disabled={isSubmitting}
              >
                <X className="size-4" />
              </Button>
            ) : null}
          </div>

          <div className="flex min-w-0 items-center gap-1 rounded-md border bg-background px-1.5">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <Input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search bookmarks..."
              className="min-w-0 border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
              autoComplete="off"
              aria-label="Search"
            />
            {search.trim().length > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
                aria-label="Clear search"
                onClick={() => onSearchChange("")}
              >
                <X className="size-4" />
              </Button>
            ) : null}
          </div>

          <Select value={sortBy} onValueChange={handleSortChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {SORT_PARAMS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
