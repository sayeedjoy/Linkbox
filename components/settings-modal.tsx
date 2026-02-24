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
import { useSession, signOut } from "next-auth/react";
import { SunIcon, DownloadIcon, TrashIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
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
import { listApiTokens } from "@/app/actions/api-tokens";

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
  const [isDeleting, setIsDeleting] = useState(false);
  const [apiTokens, setApiTokens] = useState<
    { id: string; name: string; tokenPrefix: string | null; tokenSuffix: string | null; createdAt: Date; lastUsedAt: Date | null }[]
  >([]);

  useEffect(() => {
    if (open) listApiTokens().then(setApiTokens);
  }, [open]);

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
        <DialogContent className="sm:max-w-md max-h-[90dvh] overflow-hidden overflow-x-hidden flex flex-col min-w-0">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto overflow-x-hidden min-h-0 flex-1 flex flex-col gap-4 py-2 min-w-0">
            <div className="rounded-xl border border-border bg-muted/20 p-4 flex flex-col gap-3">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                THEME
              </span>
              <Select value={theme} onValueChange={handleThemeChange}>
                <SelectTrigger className="w-full h-8">
                  <SunIcon className="size-4 shrink-0" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-xl border border-border bg-muted/20 p-4 flex flex-col gap-3">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                ORGANIZATION
              </span>
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5 min-w-0">
                  <Label htmlFor="auto-group" className="font-medium">
                    Auto-group new bookmarks
                  </Label>
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
                  className="shrink-0"
                />
              </div>
            </div>
            <div className="rounded-xl border border-border bg-muted/20 p-4 flex flex-col gap-3">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                API TOKENS
              </span>
              {apiTokens.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No API tokens. Create one from the Generate API Token option in the menu.
                </p>
              ) : (
                <ul className="space-y-2">
                  {apiTokens.map((t) => (
                    <li
                      key={t.id}
                      className="flex items-start gap-3 rounded-lg border border-border bg-background px-3 py-2.5"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{t.name}</span>
                          {(t.tokenPrefix ?? t.tokenSuffix) && (
                            <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
                              {[t.tokenPrefix, "…", t.tokenSuffix].filter(Boolean).join("")}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                          <span>Created: {new Intl.DateTimeFormat("en-US", { month: "numeric", day: "numeric", year: "numeric" }).format(new Date(t.createdAt))}</span>
                          {t.lastUsedAt != null ? (
                            <span>Last used: {new Intl.DateTimeFormat("en-US", { month: "numeric", day: "numeric", year: "numeric" }).format(new Date(t.lastUsedAt))}</span>
                          ) : (
                            <span>Last used: Never</span>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="rounded-xl border border-border bg-muted/20 p-4 flex flex-col gap-3">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                ACCOUNT
              </span>
              <p className="text-sm text-muted-foreground">
                {session?.user?.email ?? "—"}
              </p>
              <div className="flex flex-col gap-2">
                <Button variant="outline" size="default" className="h-8 w-full sm:w-auto" onClick={handleExport}>
                  <DownloadIcon className="size-4" />
                  Export bookmarks
                </Button>
                <Button
                  variant="ghost"
                  size="default"
                  className="h-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
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
