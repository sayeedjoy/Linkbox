"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSession } from "next-auth/react";
import { SunIcon, DownloadIcon, TrashIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
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

const THEME_KEY = "bookmark-theme";
const AUTO_GROUP_KEY = "bookmark-auto-group";

export function SettingsModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: session } = useSession();
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
  const [autoGroup, setAutoGroup] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setTheme(
      (localStorage.getItem(THEME_KEY) as "light" | "dark" | "system") ?? "system"
    );
    setAutoGroup(localStorage.getItem(AUTO_GROUP_KEY) === "true");
  }, [open]);

  const handleThemeChange = useCallback((v: string) => {
    const next = v as "light" | "dark" | "system";
    setTheme(next);
    localStorage.setItem(THEME_KEY, next);
    if (next === "dark") document.documentElement.classList.add("dark");
    else if (next === "light") document.documentElement.classList.remove("dark");
    else {
      const prefers = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (prefers) document.documentElement.classList.add("dark");
      else document.documentElement.classList.remove("dark");
    }
  }, []);

  const handleAutoGroupChange = useCallback((checked: boolean) => {
    setAutoGroup(checked);
    localStorage.setItem(AUTO_GROUP_KEY, checked ? "true" : "false");
  }, []);

  const handleExport = useCallback(() => {
    window.open("/api/export", "_blank");
  }, []);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 py-2">
            <div className="grid gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Theme
              </span>
              <Select value={theme} onValueChange={handleThemeChange}>
                <SelectTrigger className="w-full">
                  <SunIcon className="size-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Organization
              </span>
              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-group">Auto-group new bookmarks</Label>
                  <p id="auto-group-desc" className="text-xs text-muted-foreground">
                    When enabled, new bookmarks may be assigned to an existing
                    group (applies across the app + extension).
                  </p>
                </div>
                <Switch
                  id="auto-group"
                  checked={autoGroup}
                  onCheckedChange={handleAutoGroupChange}
                  aria-describedby="auto-group-desc"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Account
              </span>
              <p className="text-sm text-muted-foreground">
                {session?.user?.email ?? "—"}
              </p>
              <div className="flex flex-col gap-2">
                <Button variant="outline" onClick={handleExport}>
                  <DownloadIcon className="size-4" />
                  Export bookmarks
                </Button>
                <Button
                  variant="ghost"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setDeleteConfirmOpen(true)}
                >
                  <TrashIcon className="size-4" />
                  Delete account
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
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
              onClick={() => {}}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
