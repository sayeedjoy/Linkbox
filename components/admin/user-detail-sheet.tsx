"use client";

import { useEffect, useState, useTransition } from "react";
import {
  BookmarkIcon,
  FolderIcon,
  KeyIcon,
  BotIcon,
  ClockIcon,
  CalendarIcon,
  ShieldOffIcon,
  ShieldCheckIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  getUserDetailsAsAdmin,
  banUserAsAdmin,
  unbanUserAsAdmin,
  type UserDetails,
} from "@/app/actions/admin-users";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

export interface UserDetailDialogProps {
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  isCurrentAdmin: boolean;
  onClose: () => void;
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-muted/40 px-3 py-2.5">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <Icon className="size-3.5" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <div className="text-sm font-semibold text-foreground">{value}</div>
      </div>
    </div>
  );
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatBannedUntil(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (date <= new Date()) return ""; // expired ban, treat as not banned
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function isBanned(iso: string | null): boolean {
  if (!iso) return false;
  return new Date(iso) > new Date();
}

function initialsFor(name: string | null, email: string | null) {
  const source = name?.trim() || email?.trim() || "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2)
    return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

const BAN_OPTIONS = [
  { value: "1h", label: "1 hour" },
  { value: "24h", label: "24 hours" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
];

export function UserDetailDialog({
  userId,
  userEmail,
  userName,
  isCurrentAdmin,
  onClose,
}: UserDetailDialogProps) {
  const [details, setDetails] = useState<UserDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [banDuration, setBanDuration] = useState("24h");
  const [showBanConfirm, setShowBanConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isOpen = userId !== null;

  function loadDetails(id: string) {
    setDetails(null);
    setError(null);
    setIsLoading(true);

    getUserDetailsAsAdmin(id)
      .then((result) => {
        if (!result.success) {
          setError(result.error);
        } else {
          setDetails(result.data);
        }
      })
      .catch(() => {
        setError("Failed to load user details.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }

  useEffect(() => {
    if (!userId) {
      setDetails(null);
      setError(null);
      setIsLoading(false);
      return;
    }
    loadDetails(userId);
  }, [userId]);

  function handleBan() {
    if (!userId) return;
    setShowBanConfirm(false);

    startTransition(async () => {
      const result = await banUserAsAdmin(userId, banDuration);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("User banned");
      loadDetails(userId);
    });
  }

  function handleUnban() {
    if (!userId) return;

    startTransition(async () => {
      const result = await unbanUserAsAdmin(userId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Ban lifted");
      loadDetails(userId);
    });
  }

  const banned = isBanned(details?.bannedUntil ?? null);
  const bannedUntilLabel = formatBannedUntil(details?.bannedUntil ?? null);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="flex max-h-[min(720px,calc(100vh-2rem))] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader className="px-5 pb-4 pt-5">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-sm font-semibold text-muted-foreground">
                {initialsFor(userName, userEmail)}
              </div>
              <div className="min-w-0">
                <DialogTitle className="truncate text-base">
                  {userName ?? "Unnamed"}
                </DialogTitle>
                <DialogDescription className="truncate text-xs">
                  {userEmail}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <Separator />

          <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
            {isLoading && (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
                ))}
              </div>
            )}

            {error && !isLoading && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </p>
            )}

            {details && !isLoading && (
              <div className="space-y-2">
                {banned && (
                  <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                    <ShieldOffIcon className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
                        Suspended until {bannedUntilLabel}
                      </p>
                    </div>
                  </div>
                )}

                <Stat
                  icon={BookmarkIcon}
                  label="Bookmarks"
                  value={details.bookmarkCount.toLocaleString()}
                />
                <Stat
                  icon={FolderIcon}
                  label="Groups"
                  value={details.groupCount.toLocaleString()}
                />
                <Stat
                  icon={KeyIcon}
                  label="API Tokens"
                  value={details.apiTokenCount.toLocaleString()}
                />
                <Stat
                  icon={BotIcon}
                  label="AI Auto-Group"
                  value={
                    details.autoGroupEnabled ? (
                      <Badge
                        variant="outline"
                        className="border-emerald-600/20 bg-emerald-500/10 text-xs text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-400"
                      >
                        Enabled
                      </Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">Disabled</span>
                    )
                  }
                />
                <Stat
                  icon={CalendarIcon}
                  label="Member Since"
                  value={formatDate(details.createdAt)}
                />
                <Stat
                  icon={ClockIcon}
                  label="Last Extension Use"
                  value={
                    details.lastTokenUsedAt
                      ? formatDate(details.lastTokenUsedAt)
                      : "Never"
                  }
                />
              </div>
            )}
          </div>

          {/* Ban / Unban controls shown only for non-admin users once data is loaded. */}
          {details && !isLoading && !isCurrentAdmin && (
            <>
              <Separator />
              <div className="space-y-2 px-5 pb-5 pt-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Account Suspension
                </p>
                {banned ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-1.5"
                    disabled={isPending}
                    onClick={handleUnban}
                  >
                    <ShieldCheckIcon className="size-3.5 text-emerald-500" />
                    {isPending ? "Lifting ban..." : "Lift suspension"}
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <Select value={banDuration} onValueChange={setBanDuration}>
                      <SelectTrigger className="h-8 flex-1 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BAN_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value} className="text-xs">
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-amber-700 hover:bg-amber-500/10 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
                      disabled={isPending}
                      onClick={() => setShowBanConfirm(true)}
                    >
                      <ShieldOffIcon className="size-3.5" />
                      Suspend
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={showBanConfirm} onOpenChange={setShowBanConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspend user?</AlertDialogTitle>
            <AlertDialogDescription>
              {userEmail} will not be able to sign in for{" "}
              {BAN_OPTIONS.find((o) => o.value === banDuration)?.label ?? banDuration}.
              Existing sessions remain active until they expire.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={(e) => {
                e.preventDefault();
                handleBan();
              }}
            >
              <ShieldOffIcon className="size-3.5" />
              {isPending ? "Suspending..." : "Suspend"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
