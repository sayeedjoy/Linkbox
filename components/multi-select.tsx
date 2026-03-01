"use client";

import { motion, AnimatePresence } from "motion/react";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
  selectedCount: number;
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

// Desktop horizontal toolbar
function DesktopToolbar({
  allSelected,
  onSelectAll,
  onMove,
  onCopyUrls,
  onExport,
  onDelete,
  onClose,
  hasUsername,
  onMakePublic,
  onMakePrivate,
}: Omit<MultiSelectToolbarProps, "selectedCount">) {
  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="fixed left-1/2 bottom-8 z-50 w-auto -translate-x-1/2 motion-reduce:transition-none motion-reduce:animate-none"
    >
      <div className="w-auto overflow-x-auto rounded-lg bg-popover text-popover-foreground p-1 shadow-md ring-1 ring-foreground/10">
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
              <DropdownMenuItem
                onClick={() => onExport("csv")}
                className="whitespace-nowrap"
              >
                <FileText className="h-4 w-4" />
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onExport("json")}
                className="whitespace-nowrap"
              >
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

// Mobile bottom sheet
function MobileMultiSelectSheet({
  selectedCount,
  allSelected,
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
  const actionButtonClass =
    "flex items-center gap-3 w-full px-4 py-3 text-sm font-medium rounded-lg hover:bg-accent active:bg-accent transition-colors justify-start h-auto";

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" showCloseButton={false} className="rounded-t-2xl">
        <SheetHeader className="flex flex-row items-center justify-between">
          <SheetTitle>{selectedCount} selected</SheetTitle>
          <SheetClose asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Close selection"
            >
              <X className="h-4 w-4" />
            </Button>
          </SheetClose>
        </SheetHeader>
        <div className="flex flex-col gap-0.5 px-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button
            variant="ghost"
            onClick={onSelectAll}
            className={actionButtonClass}
          >
            <ListChecks className="h-5 w-5 text-muted-foreground" />
            {allSelected ? "Unselect All" : "Select All"}
          </Button>

          <Button
            variant="ghost"
            onClick={onMove}
            className={actionButtonClass}
          >
            <GripVertical className="h-5 w-5 text-muted-foreground" />
            Move to Group
          </Button>

          <Button
            variant="ghost"
            onClick={onCopyUrls}
            className={actionButtonClass}
          >
            <CopyCheck className="h-5 w-5 text-muted-foreground" />
            Copy URLs
          </Button>

          <Button
            variant="ghost"
            onClick={() => onExport("csv")}
            className={actionButtonClass}
          >
            <FileText className="h-5 w-5 text-muted-foreground" />
            Export as CSV
          </Button>

          <Button
            variant="ghost"
            onClick={() => onExport("json")}
            className={actionButtonClass}
          >
            <Braces className="h-5 w-5 text-muted-foreground" />
            Export as JSON
          </Button>

          {hasUsername && onMakePublic && (
            <Button
              variant="ghost"
              onClick={onMakePublic}
              className={actionButtonClass}
            >
              <Globe className="h-5 w-5 text-muted-foreground" />
              Make Public
            </Button>
          )}

          {hasUsername && onMakePrivate && (
            <Button
              variant="ghost"
              onClick={onMakePrivate}
              className={actionButtonClass}
            >
              <GlobeLock className="h-5 w-5 text-muted-foreground" />
              Make Private
            </Button>
          )}

          <Button
            variant="ghost"
            onClick={onDelete}
            className={`${actionButtonClass} text-destructive hover:bg-destructive/10 hover:text-destructive`}
          >
            <Trash2 className="h-5 w-5" />
            Delete
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function MultiSelectToolbar(props: MultiSelectToolbarProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <MobileMultiSelectSheet {...props} />;
  }

  return (
    <AnimatePresence>
      <DesktopToolbar {...props} />
    </AnimatePresence>
  );
}
