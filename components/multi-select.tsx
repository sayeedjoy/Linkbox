"use client";

import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ListChecks,
  X,
  GripVertical,
  CopyCheck,
  Trash2,
  Download,
  FileText,
  Braces,
  Globe,
  GlobeLock,
} from "lucide-react";

interface MultiSelectToolbarProps {
  allSelected?: boolean;
  onSelectAll: () => void;
  onMove: () => void;
  onCopyUrls: () => void;
  onExport: (format: "csv" | "json") => void;
  onDelete: () => void;
  onClose: () => void;
  hasUsername?: boolean;
  onMakePublic?: () => void;
  onMakePrivate?: () => void;
}

export function MultiSelectToolbar({
  allSelected = false,
  onSelectAll,
  onMove,
  onCopyUrls,
  onExport,
  onDelete,
  onClose,
  hasUsername,
  onMakePublic,
  onMakePrivate,
}: MultiSelectToolbarProps) {
  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="fixed inset-x-2 bottom-4 z-50 motion-reduce:transition-none motion-reduce:animate-none sm:left-1/2 sm:right-auto sm:bottom-8 sm:w-auto sm:-translate-x-1/2"
    >
      <div className="w-full overflow-x-auto rounded-lg bg-popover text-popover-foreground p-1 shadow-md ring-1 ring-foreground/10 sm:w-auto">
        <div className="flex min-w-max items-center gap-0.5">
        <Button
          variant="ghost"
          size="sm"
          onClick={onSelectAll}
          className="h-auto shrink-0 gap-1.5 rounded-md px-1.5 py-1 text-[13px] hover:bg-accent hover:text-accent-foreground"
        >
          <ListChecks className="h-4 w-4" />
          {allSelected ? "Unselect All" : "Select All"}
        </Button>
        <div className="h-4 w-px bg-border mx-0.5 -my-1" />
        <Button
          variant="ghost"
          size="sm"
          onClick={onMove}
          className="h-auto shrink-0 gap-1.5 rounded-md px-1.5 py-1 text-[13px] hover:bg-accent hover:text-accent-foreground"
        >
          <GripVertical className="h-4 w-4" />
          Move
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCopyUrls}
          className="h-auto shrink-0 gap-1.5 rounded-md px-1.5 py-1 text-[13px] hover:bg-accent hover:text-accent-foreground"
        >
          <CopyCheck className="h-4 w-4" />
          Copy URLs
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-auto shrink-0 gap-1.5 rounded-md px-1.5 py-1 text-[13px] hover:bg-accent hover:text-accent-foreground"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-40">
            <DropdownMenuItem onClick={() => onExport("csv")} className="whitespace-nowrap">
              <FileText className="h-4 w-4" />
              Export as CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport("json")} className="whitespace-nowrap">
              <Braces className="h-4 w-4" />
              Export as JSON
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {hasUsername && onMakePublic && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onMakePublic}
            className="h-auto shrink-0 gap-1.5 rounded-md px-1.5 py-1 text-[13px] hover:bg-accent hover:text-accent-foreground"
          >
            <Globe className="h-4 w-4" />
            Public
          </Button>
        )}
        {hasUsername && onMakePrivate && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onMakePrivate}
            className="h-auto shrink-0 gap-1.5 rounded-md px-1.5 py-1 text-[13px] hover:bg-accent hover:text-accent-foreground"
          >
            <GlobeLock className="h-4 w-4" />
            Private
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="h-auto shrink-0 gap-1.5 rounded-md px-1.5 py-1 text-[13px] text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
        <div className="h-4 w-px bg-border mx-0.5" />
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-auto shrink-0 rounded-md p-1 hover:bg-accent hover:text-accent-foreground"
          aria-label="Close multi-select toolbar"
        >
          <X className="h-4 w-4" />
        </Button>
        </div>
      </div>
    </motion.div>
  );
}
