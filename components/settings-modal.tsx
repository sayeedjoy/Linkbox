"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor, Download, Upload, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deleteAccount } from "@/app/actions/auth";
import {
  importBookmarks,
  previewImportBookmarks,
  type ImportBookmarkItem,
} from "@/app/actions/bookmarks";
import {
  getAutoGroupEnabled,
  updateAutoGroupEnabled,
} from "@/app/actions/settings";

const MAX_IMPORT_ITEMS = 5000;

const sectionLabelClass =
  "text-xs font-medium uppercase tracking-wide text-muted-foreground";

function ThemeIcon({ theme }: { theme: "light" | "dark" | "system" }) {
  if (theme === "light") return <Sun className="size-4 shrink-0" />;
  if (theme === "dark") return <Moon className="size-4 shrink-0" />;
  return <Monitor className="size-4 shrink-0" />;
}

export function SettingsModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const [autoGroup, setAutoGroup] = useState(false);
  const [autoGroupLoading, setAutoGroupLoading] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isPreviewingImport, setIsPreviewingImport] = useState(false);
  const [importConfirmOpen, setImportConfirmOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importItems, setImportItems] = useState<ImportBookmarkItem[]>([]);
  const [importPreview, setImportPreview] = useState<{
    total: number;
    duplicateCount: number;
    invalidCount: number;
  } | null>(null);

  useEffect(() => {
    if (!open) {
      // Clear stale import state when modal closes
      setImportItems([]);
      setImportPreview(null);
      setImportConfirmOpen(false);
      return;
    }
    setAutoGroupLoading(true);
    getAutoGroupEnabled()
      .then(setAutoGroup)
      .catch(() => {})
      .finally(() => setAutoGroupLoading(false));
  }, [open]);

  const handleThemeChange = useCallback(
    (v: string) => {
      setTheme(v as "light" | "dark" | "system");
    },
    [setTheme]
  );

  const displayTheme = (theme ?? "system") as "light" | "dark" | "system";

  const handleAutoGroupChange = useCallback(async (checked: boolean) => {
    setAutoGroup(checked);
    try {
      await updateAutoGroupEnabled(checked);
    } catch {
      setAutoGroup(!checked);
      toast.error("Failed to update setting");
    }
  }, []);

  const handleExport = useCallback(() => {
    window.open("/api/export", "_blank");
  }, []);

  const toImportItem = useCallback((value: unknown): ImportBookmarkItem | null => {
    if (!value || typeof value !== "object") return null;
    const row = value as Record<string, unknown>;
    const url = typeof row.url === "string" ? row.url : "";
    const description = typeof row.description === "string" ? row.description : null;
    // Filter out items that are neither a valid bookmark (has URL) nor a note (has description)
    if (!url && !description) return null;
    return {
      url,
      title: typeof row.title === "string" ? row.title : null,
      description,
      faviconUrl: typeof row.faviconUrl === "string" ? row.faviconUrl : null,
      previewImageUrl:
        typeof row.previewImageUrl === "string" ? row.previewImageUrl : null,
      group: typeof row.group === "string" ? row.group : null,
      groupColor: typeof row.groupColor === "string" ? row.groupColor : null,
      createdAt: typeof row.createdAt === "string" ? row.createdAt : null,
    };
  }, []);

  const handleImportClick = useCallback(() => {
    if (!fileInputRef.current) return;
    fileInputRef.current.value = "";
    fileInputRef.current.click();
  }, []);

  const handleImportFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      let parsed: unknown;
      try {
        const text = await file.text();
        parsed = JSON.parse(text);
      } catch {
        toast.error("Invalid JSON file");
        event.target.value = "";
        return;
      }
      if (!Array.isArray(parsed)) {
        toast.error("Import file must be a JSON array");
        event.target.value = "";
        return;
      }
      const items = parsed
        .map(toImportItem)
        .filter((item): item is ImportBookmarkItem => item !== null);
      if (items.length === 0) {
        toast.error("No bookmarks found in file");
        event.target.value = "";
        return;
      }
      if (items.length > MAX_IMPORT_ITEMS) {
        toast.error(`Import file exceeds maximum of ${MAX_IMPORT_ITEMS.toLocaleString()} items`);
        event.target.value = "";
        return;
      }
      setIsPreviewingImport(true);
      try {
        const preview = await previewImportBookmarks(items);
        if ("error" in preview && preview.error) {
          toast.error(preview.error);
          return;
        }
        if (preview.total === 0 || preview.total === preview.invalidCount) {
          toast.error("No valid bookmarks to import");
          return;
        }
        setImportItems(items);
        setImportPreview(preview);
        setImportConfirmOpen(true);
      } catch {
        toast.error("Failed to preview import");
      } finally {
        setIsPreviewingImport(false);
        event.target.value = "";
      }
    },
    [toImportItem]
  );

  const handleConfirmImport = useCallback(async () => {
    if (importItems.length === 0) return;
    setIsImporting(true);
    try {
      const result = await importBookmarks(importItems);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      const totalImported = result.created + result.updated;
      toast.success(`Imported ${totalImported} bookmarks (${result.updated} replaced)`);
      setImportConfirmOpen(false);
      setImportItems([]);
      setImportPreview(null);
    } catch {
      toast.error("Failed to import bookmarks");
    } finally {
      setIsImporting(false);
    }
  }, [importItems]);

  const handleDeleteAccount = useCallback(async () => {
    setIsDeleting(true);
    try {
      const result = await deleteAccount();
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setDeleteConfirmOpen(false);
      onOpenChange(false);
      await signOut({ redirect: false });
      window.location.href = "/sign-in";
    } catch {
      toast.error("Failed to delete account");
    } finally {
      setIsDeleting(false);
    }
  }, [onOpenChange]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm rounded-lg border bg-background p-6 shadow-lg [&>button]:top-4 [&>button]:right-4">
          <DialogHeader className="text-center sm:text-left">
            <DialogTitle className="text-lg font-semibold leading-none">
              Settings
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col space-y-6">
            <div>
              <span className={sectionLabelClass}>Theme</span>
              <Select value={displayTheme} onValueChange={handleThemeChange}>
                <SelectTrigger className="mt-2 w-full h-9">
                  <ThemeIcon theme={displayTheme} />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <span className={sectionLabelClass}>Organization</span>
              <div className="mt-2 rounded-lg border border-border px-3 py-2.5 flex flex-row items-center justify-between gap-3">
                <div className="min-w-0 space-y-0.5">
                  <span className="text-sm font-medium block">
                    Auto-group new bookmarks
                  </span>
                  <p
                    id="auto-group-desc"
                    className="text-xs text-muted-foreground"
                  >
                    Turning this on will automatically categorize new bookmarks using AI.
                  </p>
                </div>
                <Switch
                  id="auto-group"
                  checked={autoGroup}
                  onCheckedChange={handleAutoGroupChange}
                  disabled={autoGroupLoading}
                  aria-describedby="auto-group-desc"
                  className="h-[1.15rem] w-8 shrink-0"
                />
              </div>
            </div>
            <div>
              <span className={sectionLabelClass}>Account</span>
              <p className="text-sm text-muted-foreground mt-1">
                {session?.user?.email ?? "—"}
              </p>
            </div>
            <button
              type="button"
              onClick={handleExport}
              className="w-full rounded-lg border border-border px-2.5 py-2 text-sm flex items-center gap-2 hover:bg-muted/50 hover:border-primary/15 transition-colors text-left"
            >
              <Download className="size-4 text-muted-foreground" />
              Export bookmarks
            </button>
            <button
              type="button"
              onClick={handleImportClick}
              disabled={isPreviewingImport || isImporting}
              className="w-full rounded-lg border border-border px-2.5 py-2 text-sm flex items-center gap-2 hover:bg-muted/50 hover:border-primary/15 transition-colors text-left disabled:opacity-60 disabled:pointer-events-none"
            >
              <Upload className="size-4 text-muted-foreground" />
              {isPreviewingImport ? "Checking import file..." : "Import bookmarks"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleImportFileChange}
            />
            <div className="border-t border-border pt-4">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(true)}
                className="w-full rounded-lg px-2.5 py-2 text-sm text-destructive flex items-center gap-2 hover:bg-destructive/10 transition-colors text-left"
              >
                <Trash2 className="size-4" />
                Delete account
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <AlertDialog open={importConfirmOpen} onOpenChange={setImportConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Import bookmarks</AlertDialogTitle>
            <AlertDialogDescription>
              {importPreview
                ? `Import ${importPreview.total - importPreview.invalidCount} bookmarks? ${importPreview.duplicateCount} duplicates will be replaced.`
                : "Import bookmarks from this file?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isImporting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmImport();
              }}
              disabled={isImporting}
            >
              {isImporting ? "Importing..." : "Import"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete account</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your account and all bookmarks. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                handleDeleteAccount();
              }}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
