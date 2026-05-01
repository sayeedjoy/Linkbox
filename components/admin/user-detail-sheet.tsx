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
  CrownIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  getUserDetailsAsAdmin,
  banUserAsAdmin,
  unbanUserAsAdmin,
  setUserSubscriptionPlanAsAdmin,
  clearManualPlanOverrideAsAdmin,
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
  SelectGroup,
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
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
  getUserAvatarSeed,
  getUserAvatarStyle,
  getUserInitials,
} from "@/lib/avatar-gradient";

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
  const [planDraft, setPlanDraft] = useState<string>("");

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
          setPlanDraft(result.data.subscriptionPlanId);
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

  function handleAssignPlanManual() {
    if (!userId) return;
    startTransition(async () => {
      const result = await setUserSubscriptionPlanAsAdmin(userId, planDraft);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Plan assigned (manual lock)");
      loadDetails(userId);
    });
  }

  function handleClearManualPlan() {
    if (!userId) return;
    startTransition(async () => {
      const result = await clearManualPlanOverrideAsAdmin(userId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Manual override cleared — user is on Free until Play verifies again.");
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
              <div
                className="flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-semibold shadow-sm"
                style={getUserAvatarStyle(getUserAvatarSeed(userName, userEmail))}
                aria-label={`${userName ?? userEmail ?? "User"} avatar`}
              >
                {getUserInitials(userName, userEmail)}
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
              <div className="flex flex-col gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 rounded-lg" />
                ))}
              </div>
            )}

            {error && !isLoading && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </p>
            )}

            {details && !isLoading && (
              <div className="flex flex-col gap-2">
                {banned && (
                  <div className="flex items-center gap-2 rounded-lg border border-warning/20 bg-warning/10 px-3 py-2">
                    <ShieldOffIcon className="size-4 shrink-0 text-warning-foreground" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-warning-foreground">
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
                      <Badge className="bg-success/10 text-success">Enabled</Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">Disabled</span>
                    )
                  }
                />
                <div className="rounded-lg border border-border bg-muted/20 p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <CrownIcon className="size-3.5 text-muted-foreground" />
                    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      Subscription
                    </p>
                  </div>
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-semibold text-foreground">{details.planDisplayName}</span>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {details.planSource}
                    </Badge>
                    <span className="text-xs text-muted-foreground">({details.planSlug})</span>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-[10px] text-muted-foreground">Change plan</p>
                      <Select value={planDraft} onValueChange={setPlanDraft}>
                        <SelectTrigger className="h-9 w-full sm:max-w-xs">
                          <SelectValue placeholder="Plan" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {details.availablePlans.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {`${p.displayName} (${p.slug})`}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="shrink-0"
                      disabled={isPending || !planDraft}
                      onClick={handleAssignPlanManual}
                    >
                      Lock manual
                    </Button>
                  </div>
                  {details.planSource === "admin" && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2 w-full sm:w-auto"
                      disabled={isPending}
                      onClick={handleClearManualPlan}
                    >
                      Clear manual override
                    </Button>
                  )}
                </div>
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
              <div className="flex flex-col gap-2 px-5 pb-5 pt-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Account Suspension
                </p>
                {banned ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    disabled={isPending}
                    onClick={handleUnban}
                  >
                    {isPending ? (
                      <Spinner data-icon="inline-start" />
                    ) : (
                      <ShieldCheckIcon data-icon="inline-start" />
                    )}
                    {isPending ? "Lifting ban..." : "Lift suspension"}
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <Select value={banDuration} onValueChange={setBanDuration}>
                      <SelectTrigger className="h-8 flex-1 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {BAN_OPTIONS.map((opt) => (
                            <SelectItem
                              key={opt.value}
                              value={opt.value}
                              className="text-xs"
                            >
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={isPending}
                      onClick={() => setShowBanConfirm(true)}
                    >
                      {isPending ? (
                        <Spinner data-icon="inline-start" />
                      ) : (
                        <ShieldOffIcon data-icon="inline-start" />
                      )}
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
              variant="destructive"
              disabled={isPending}
              onClick={(e) => {
                e.preventDefault();
                handleBan();
              }}
            >
              {isPending ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <ShieldOffIcon data-icon="inline-start" />
              )}
              {isPending ? "Suspending..." : "Suspend"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
