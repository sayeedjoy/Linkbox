"use client";

import Link from "next/link";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import {
  useDeferredValue,
  useEffect,
  useState,
  useTransition,
} from "react";
import {
  Search,
  Trash,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  DownloadIcon,
  InfoIcon,
  ShieldOffIcon,
  SlidersHorizontalIcon,
  UserRoundCheckIcon,
} from "lucide-react";
import { toast } from "sonner";
import { deleteUserAsAdmin } from "@/app/actions/admin-users";
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
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { InviteUserDialog } from "@/components/admin/invite-user-dialog";
import { UserDetailDialog } from "@/components/admin/user-detail-sheet";

type UserStatusFilter = "all" | "active" | "banned" | "admin";
type UserSortOption = "bookmarks" | "newest" | "oldest" | "name";

export type AdminUserRow = {
  id: string;
  name: string | null;
  email: string;
  createdAt: string;
  bookmarkCount: number;
  isCurrentAdmin: boolean;
  isBanned: boolean;
};

type AdminUsersCardProps = {
  users: AdminUserRow[];
  query: string;
  status: UserStatusFilter;
  sort: UserSortOption;
  page: number;
  totalPages: number;
  totalUsers: number;
};

const statusLabels: Record<UserStatusFilter, string> = {
  all: "All users",
  active: "Active",
  banned: "Banned",
  admin: "Current admin",
};

const sortLabels: Record<UserSortOption, string> = {
  bookmarks: "Most bookmarks",
  newest: "Newest first",
  oldest: "Oldest first",
  name: "Name A-Z",
};

function buildUsersHref({
  page,
  query,
  status,
  sort,
}: {
  page: number;
  query: string;
  status: UserStatusFilter;
  sort: UserSortOption;
}) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (status !== "all") params.set("status", status);
  if (sort !== "bookmarks") params.set("sort", sort);
  if (page > 1) params.set("page", String(page));

  const search = params.toString();
  return search ? `/admin/users?${search}` : "/admin/users";
}

function initialsFor(name: string | null, email: string) {
  const source = name?.trim() || email.trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

function formatJoinedDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function AdminUsersCard({
  users,
  query,
  status,
  sort,
  page,
  totalPages,
  totalUsers,
}: AdminUsersCardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [targetUser, setTargetUser] = useState<AdminUserRow | null>(null);
  const [detailUser, setDetailUser] = useState<AdminUserRow | null>(null);
  const [searchValue, setSearchValue] = useState(query);
  const deferredSearchValue = useDeferredValue(searchValue);

  useEffect(() => {
    setSearchValue(query);
  }, [query]);

  useEffect(() => {
    const trimmed = deferredSearchValue.trim();
    const currentQuery = searchParams.get("q") ?? "";

    if (trimmed === currentQuery) return;

    const timeoutId = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());

      if (trimmed) {
        params.set("q", trimmed);
      } else {
        params.delete("q");
      }

      params.delete("page");

      const nextSearch = params.toString();
      router.replace(nextSearch ? `${pathname}?${nextSearch}` : pathname, {
        scroll: false,
      });
    }, 220);

    return () => window.clearTimeout(timeoutId);
  }, [deferredSearchValue, pathname, router, searchParams]);

  function updateFilter(key: "status" | "sort", value: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (
      (key === "status" && value === "all") ||
      (key === "sort" && value === "bookmarks")
    ) {
      params.delete(key);
    } else {
      params.set(key, value);
    }

    params.delete("page");
    const nextSearch = params.toString();
    router.replace(nextSearch ? `${pathname}?${nextSearch}` : pathname, {
      scroll: false,
    });
  }

  function clearFilters() {
    setSearchValue("");
    router.replace(pathname, { scroll: false });
  }

  const hasFilters = query !== "" || status !== "all" || sort !== "bookmarks";
  const summary =
    totalUsers === 0
      ? query
        ? `No results for "${query}"`
        : "No accounts found"
      : `${totalUsers} account${totalUsers === 1 ? "" : "s"} found`;

  const handleDelete = () => {
    if (!targetUser) return;

    startTransition(async () => {
      const result = await deleteUserAsAdmin(targetUser.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("User deleted");
      setTargetUser(null);
      router.refresh();
    });
  };

  return (
    <>
      <Card>
        <CardHeader className="space-y-4 border-b border-border pb-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-0.5">
              <CardTitle>User Accounts</CardTitle>
              <CardDescription>
                Search, filter, review, and manage registered accounts. The
                current admin account is protected.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="tabular-nums">
                {totalUsers} total
              </Badge>
              <Badge variant="secondary" className="tabular-nums">
                {users.length} visible
              </Badge>
              <InviteUserDialog onSuccess={() => router.refresh()} />
              <Button variant="outline" size="sm" className="gap-1.5" asChild>
                <a href="/api/admin/users/export" download>
                  <DownloadIcon className="size-3.5" />
                  Export CSV
                </a>
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-muted/20 p-3">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder="Search by name or email..."
                  className="bg-background pl-9"
                  aria-label="Search users by name or email"
                />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Select
                  value={status}
                  onValueChange={(value) => updateFilter("status", value)}
                >
                  <SelectTrigger className="w-full bg-background sm:w-[160px]">
                    <SelectValue aria-label="Status filter" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={sort}
                  onValueChange={(value) => updateFilter("sort", value)}
                >
                  <SelectTrigger className="w-full bg-background sm:w-[170px]">
                    <SelectValue aria-label="Sort users" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(sortLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {hasFilters && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="justify-start"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <SlidersHorizontalIcon className="size-3.5" />
                {summary}
              </span>
              <Badge variant="outline" className="bg-background">
                {statusLabels[status]}
              </Badge>
              <Badge variant="outline" className="bg-background">
                {sortLabels[sort]}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table className="min-w-[780px]">
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Bookmarks</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="px-5 py-12">
                      <div className="mx-auto max-w-sm text-center">
                        <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-xl bg-muted">
                          <Search className="size-5 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium text-foreground">
                          No matching users
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {query
                            ? "Try a different name or email. Results update as you type."
                            : "User accounts will appear here once created."}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user, index) => (
                    <TableRow
                      key={user.id}
                      className="border-border/60"
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-xs font-semibold text-muted-foreground shadow-sm">
                            {initialsFor(user.name, user.email)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="truncate text-sm font-medium text-foreground">
                                {user.name ?? "Unnamed"}
                              </p>
                              {user.isBanned && (
                                <ShieldOffIcon className="size-3 shrink-0 text-amber-500" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              #{(page - 1) * 20 + index + 1}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-foreground/80">
                          {user.email}
                        </span>
                      </TableCell>
                      <TableCell>
                        {user.isCurrentAdmin ? (
                          <Badge
                            variant="outline"
                            className="gap-1 border-emerald-600/20 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-400"
                          >
                            <ShieldCheck className="size-3" />
                            Admin
                          </Badge>
                        ) : user.isBanned ? (
                          <Badge
                            variant="outline"
                            className="gap-1 border-amber-600/20 bg-amber-500/10 text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-400"
                          >
                            <ShieldOffIcon className="size-3" />
                            Banned
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <UserRoundCheckIcon className="size-3" />
                            Active
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="inline-flex items-baseline gap-1 tabular-nums">
                          <span className="text-sm font-semibold text-foreground">
                            {user.bookmarkCount}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            saved
                          </span>
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatJoinedDate(user.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setDetailUser(user)}
                            className="gap-1 text-muted-foreground hover:text-foreground"
                            aria-label={`View details for ${user.email}`}
                          >
                            <InfoIcon className="size-3.5" />
                            Details
                          </Button>
                          {user.isCurrentAdmin ? (
                            <Badge
                              variant="outline"
                              className="gap-1 border-emerald-600/20 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-400"
                            >
                              <ShieldCheck className="size-3" />
                              Admin
                            </Badge>
                          ) : (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={isPending}
                              onClick={() => setTargetUser(user)}
                              className="gap-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash className="size-3" />
                              Delete
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
            </TableBody>
          </Table>

          <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Page{" "}
              <span className="font-medium text-foreground">
                {page}
              </span>{" "}
              of{" "}
              <span className="font-medium text-foreground">
                {totalPages}
              </span>
            </p>
            <div className="flex items-center gap-1.5">
              {page > 1 ? (
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="gap-1"
                >
                  <Link
                    href={buildUsersHref({
                      page: page - 1,
                      query,
                      status,
                      sort,
                    })}
                  >
                    <ChevronLeft className="size-3.5" />
                    Previous
                  </Link>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  className="gap-1"
                >
                  <ChevronLeft className="size-3.5" />
                  Previous
                </Button>
              )}
              {page < totalPages ? (
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="gap-1"
                >
                  <Link
                    href={buildUsersHref({
                      page: page + 1,
                      query,
                      status,
                      sort,
                    })}
                  >
                    Next
                    <ChevronRight className="size-3.5" />
                  </Link>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  className="gap-1"
                >
                  Next
                  <ChevronRight className="size-3.5" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog
        open={targetUser !== null}
        onOpenChange={(open) => !open && setTargetUser(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user?</AlertDialogTitle>
            <AlertDialogDescription>
              {targetUser
                ? `Delete ${targetUser.email} and all of their bookmarks, groups, API tokens, and reset tokens. This cannot be undone.`
                : "Delete this user and all associated data. This cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isPending}
              onClick={(event) => {
                event.preventDefault();
                handleDelete();
              }}
            >
              <Trash className="size-3.5" />
              {isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <UserDetailDialog
        userId={detailUser?.id ?? null}
        userEmail={detailUser?.email ?? null}
        userName={detailUser?.name ?? null}
        isCurrentAdmin={detailUser?.isCurrentAdmin ?? false}
        onClose={() => setDetailUser(null)}
      />
    </>
  );
}
