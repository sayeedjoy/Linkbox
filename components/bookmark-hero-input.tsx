"use client";

import { useRef, useCallback, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { PlusIcon, Loader } from "lucide-react";
import { cn } from "@/lib/utils";

export function BookmarkHeroInput({
  placeholder = "Insert a link, image, or just plain text…",
  searchMode,
  searchPlaceholder = "Search bookmarks…",
  value,
  onChange,
  onSubmit,
  onPaste,
  onKeyDown,
  className,
  disabled = false,
}: {
  placeholder?: string;
  searchMode?: boolean;
  searchPlaceholder?: string;
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onPaste?: (text: string, files: FileList | null) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  className?: string;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      onSubmit();
    },
    [onSubmit]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") {
        onChange("");
        inputRef.current?.blur();
      }
      onKeyDown?.(e);
    },
    [onChange, onKeyDown]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const text = e.clipboardData.getData("text");
      const files = e.clipboardData.files;
      if (text || files?.length) {
        e.preventDefault();
        onPaste?.(text, files.length ? files : null);
      }
    },
    [onPaste]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const text = e.dataTransfer.getData("text");
      const files = e.dataTransfer.files;
      if (text || files?.length) onPaste?.(text, files?.length ? files : null);
    },
    [onPaste]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("w-full", className)}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg border bg-background px-3 py-2 min-h-11 transition-colors",
          isDragging && "border-primary/50 bg-muted/50",
          disabled && "opacity-70 pointer-events-none"
        )}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 size-8"
          aria-label="Add"
          disabled={disabled}
        >
          {disabled ? (
            <Loader className="size-4 animate-spin" />
          ) : (
            <PlusIcon className="size-4" />
          )}
        </Button>
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          placeholder={searchMode ? searchPlaceholder : placeholder}
          className="flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 h-9 px-0"
          autoComplete="off"
          aria-label={searchMode ? "Search bookmarks" : "Add link, image, or text"}
          disabled={disabled}
        />
        <div className="hidden md:flex items-center gap-1 shrink-0">
          <Kbd>⌘</Kbd>
          <Kbd>F</Kbd>
        </div>
      </div>
    </form>
  );
}
