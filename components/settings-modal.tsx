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
import { SunIcon, DownloadIcon, TrashIcon, KeyIcon, CopyIcon } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { deleteAccount } from "@/app/actions/auth";
import { createApiToken, listApiTokens, revokeApiToken } from "@/app/actions/api-tokens";

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
  const [apiTokens, setApiTokens] = useState<{ id: string; name: string; createdAt: Date }[]>([]);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setTheme(
      (localStorage.getItem(THEME_KEY) as "light" | "dark" | "system") ?? "system"
    );
    setAutoGroup(localStorage.getItem(AUTO_GROUP_KEY) === "true");
  }, [open]);

  useEffect(() => {
    if (open) {
      listApiTokens().then(setApiTokens);
      setNewToken(null);
    }
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

  const handleGenerateToken = useCallback(async () => {
    setIsGenerating(true);
    try {
      const result = await createApiToken();
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setNewToken(result.token);
      setApiTokens((prev) => [{ id: result.id, name: result.name, createdAt: result.createdAt }, ...prev]);
      toast.success("Token created. Copy it now; it won't be shown again.");
    } catch {
      toast.error("Failed to create token");
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const handleCopyToken = useCallback(() => {
    if (newToken) {
      navigator.clipboard.writeText(newToken);
      toast.success("Copied to clipboard");
    }
  }, [newToken]);

  const handleRevokeToken = useCallback(async (id: string) => {
    try {
      const result = await revokeApiToken(id);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setApiTokens((prev) => prev.filter((t) => t.id !== id));
      toast.success("Token revoked");
    } catch {
      toast.error("Failed to revoke");
    }
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
      await signOut({ callbackUrl: "/sign-in" });
    } catch {
      toast.error("Failed to delete account");
    } finally {
      setIsDeleting(false);
    }
  }, [onOpenChange]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md max-h-[90dvh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto min-h-0 flex-1 grid gap-6 py-2">
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
                API tokens
              </span>
              <p className="text-xs text-muted-foreground">
                Use a token with Authorization: Bearer &lt;token&gt; for export and API access.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateToken}
                disabled={isGenerating}
              >
                <KeyIcon className="size-4" />
                {isGenerating ? "Generating…" : "Generate API Token"}
              </Button>
              {newToken && (
                <div className="space-y-1">
                  <div className="flex gap-1">
                    <Input
                      readOnly
                      value={newToken}
                      className="font-mono text-xs"
                    />
                    <Button variant="outline" size="icon" onClick={handleCopyToken}>
                      <CopyIcon className="size-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-amber-600 dark:text-amber-500">
                    Store it securely; it won't be shown again.
                  </p>
                </div>
              )}
              {apiTokens.length > 0 && (
                <div className="space-y-1 mt-2">
                  <span className="text-xs text-muted-foreground">Active tokens</span>
                  <ul className="space-y-1">
                    {apiTokens.map((t) => (
                      <li
                        key={t.id}
                        className="flex items-center justify-between rounded border border-border px-2 py-1.5 text-sm"
                      >
                        <span className="truncate">{t.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive text-xs"
                          onClick={() => handleRevokeToken(t.id)}
                        >
                          Revoke
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
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
