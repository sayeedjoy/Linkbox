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
  ShieldCheck,
  DownloadIcon,
  ShieldOffIcon,
  UserCheckIcon,
  UsersIcon,
  BookmarkIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  MoreHorizontalIcon,
  XIcon,
  EyeIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  deleteUserAsAdmin,
  banUserAsAdmin,
  unbanUserAsAdmin,
} from "@/app/actions/admin-users";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupButton,
} from "@/components/ui/input-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { InviteUserDialog } from "@/components/admin/invite-user-dialog";
import { UserDetailDialog } from "@/components/admin/user-detail-sheet";
import {
  getUserAvatarSeed,
  getUserAvatarStyle,
  getUserInitials,
} from "@/lib/avatar-gradient";

type UserStatusFilter = "all" | "active" | "banned";
type UserPlanFilter = string;
type SortByColumn = "name" | "email" | "bookmarks" | "joined";
type SortDir = "asc" | "desc";

export type AdminUserRow = {
  id: string;
  name: string | null;
  email: string;
  createdAt: string;
  bookmarkCount: number;
  isCurrentAdmin: boolean;
  isBanned: boolean;
  planSlug: string;
  planDisplayName: string;
};

type AdminUsersCardProps = {
  users: AdminUserRow[];
  query: string;
  status: UserStatusFilter;
  plan: UserPlanFilter;
  sortBy: SortByColumn | null;
  sortDir: SortDir | null;
  page: number;
  totalPages: number;
  totalUsers: number;
  stats: {
    totalUsers: number;
    activeCount: number;
    bannedCount: number;
    totalBookmarks: number;
  };
  planFilters: Array<{ value: string; label: string }>;
};

const statusLabels: Record<UserStatusFilter, string> = {
  all: "All users",
  active: "Active",
  banned: "Banned",
};

const sortDefaults: Record<SortByColumn, SortDir> = {
  name: "asc",
  email: "asc",
  bookmarks: "desc",
  joined: "desc",
};

function buildUsersHref({
  page,
  query,
  status,
  plan,
  sortBy,
  sortDir,
}: {
  page: number;
  query: string;
  status: UserStatusFilter;
  plan: UserPlanFilter;
  sortBy: SortByColumn | null;
  sortDir: SortDir | null;
}) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (status !== "all") params.set("status", status);
  if (plan !== "all") params.set("plan", plan);
  if (sortBy) params.set("sortBy", sortBy);
  if (sortDir) params.set("sortDir", sortDir);
  if (page > 1) params.set("page", String(page));

  const search = params.toString();
  return search ? `/admin/users?${search}` : "/admin/users";
}

function getSortHref(
  column: SortByColumn,
  currentSortBy: SortByColumn | null,
  currentSortDir: SortDir | null,
  query: string,
  status: UserStatusFilter,
  plan: UserPlanFilter
) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (status !== "all") params.set("status", status);
  if (plan !== "all") params.set("plan", plan);

  if (currentSortBy === column) {
    // toggle direction
    const nextDir = currentSortDir === "asc" ? "desc" : "asc";
    params.set("sortBy", column);
    params.set("sortDir", nextDir);
  } else {
    params.set("sortBy", column);
    params.set("sortDir", sortDefaults[column]);
  }

  const search = params.toString();
  return search ? `/admin/users?${search}` : "/admin/users";
}

function formatJoinedDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function getPaginationRange(
  current: number,
  total: number
): (number | "ellipsis")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (current <= 4) {
    return [1, 2, 3, 4, 5, "ellipsis", total];
  }
  if (current >= total - 3) {
    return [1, "ellipsis", total - 4, total - 3, total - 2, total - 1, total];
  }
  return [1, "ellipsis", current - 1, current, current + 1, "ellipsis", total];
}

function SortHeader({
  column,
  label,
  align,
  sortBy,
  sortDir,
  query,
  status,
  plan,
}: {
  column: SortByColumn;
  label: string;
  align?: "left" | "right";
  sortBy: SortByColumn | null;
  sortDir: SortDir | null;
  query: string;
  status: UserStatusFilter;
  plan: UserPlanFilter;
}) {
  const isActive = sortBy === column;
  const href = getSortHref(column, sortBy, sortDir, query, status, plan);

  return (
    <TableHead className={align === "right" ? "text-right" : undefined}>
      <Link
        href={href}
        className="group inline-flex items-center gap-1 transition-colors hover:text-foreground"
        scroll={false}
      >
        {label}
        <span className="inline-flex flex-col">
          {isActive && sortDir === "asc" ? (
            <ArrowUpIcon className="size-3 text-foreground" />
          ) : isActive && sortDir === "desc" ? (
            <ArrowDownIcon className="size-3 text-foreground" />
          ) : (
            <ArrowUpIcon className="size-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-50" />
          )}
        </span>
      </Link>
    </TableHead>
  );
}

export function AdminUsersCard({
  users,
  query,
  status,
  plan,
  sortBy,
  sortDir,
  page,
  totalPages,
  totalUsers,
  stats,
  planFilters,
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
      startTransition(() => {
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
      });
    }, 220);

    return () => window.clearTimeout(timeoutId);
  }, [deferredSearchValue, pathname, router, searchParams, startTransition]);

  function updateFilter(key: "status" | "plan", value: string) {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());

      if (value === "all") {
        params.delete(key);
      } else {
        params.set(key, value);
      }

      params.delete("page");
      const nextSearch = params.toString();
      router.replace(nextSearch ? `${pathname}?${nextSearch}` : pathname, {
        scroll: false,
      });
    });
  }

  function clearFilters() {
    setSearchValue("");
    startTransition(() => {
      router.replace(pathname, { scroll: false });
    });
  }

  const hasFilters = query !== "" || status !== "all" || plan !== "all";
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

  const handleQuickBan = (userId: string) => {
    startTransition(async () => {
      const result = await banUserAsAdmin(userId, "24h");
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("User suspended for 24 hours");
      router.refresh();
    });
  };

  const handleQuickUnban = (userId: string) => {
    startTransition(async () => {
      const result = await unbanUserAsAdmin(userId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Suspension lifted");
      router.refresh();
    });
  };

  const paginationRange = getPaginationRange(page, totalPages);

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card size="sm">
          <CardContent className="flex flex-col gap-1 py-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Total Users
              </p>
              <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                <UsersIcon className="size-3.5" />
              </div>
            </div>
            <p className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">
              {stats.totalUsers.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="flex flex-col gap-1 py-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Active
              </p>
              <div className="flex size-7 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <UserCheckIcon className="size-3.5" />
              </div>
            </div>
            <p className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">
              {stats.activeCount.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="flex flex-col gap-1 py-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Banned
              </p>
              <div className="flex size-7 items-center justify-center rounded-md bg-destructive/10 text-destructive">
                <ShieldOffIcon className="size-3.5" />
              </div>
            </div>
            <p className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">
              {stats.bannedCount.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="flex flex-col gap-1 py-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Bookmarks
              </p>
              <div className="flex size-7 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                <BookmarkIcon className="size-3.5" />
              </div>
            </div>
            <p className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">
              {stats.totalBookmarks.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="gap-4 border-b border-border pb-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-0.5">
              <CardTitle>User Accounts</CardTitle>
              <CardDescription>
                Search, filter, review, and manage registered accounts.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <InviteUserDialog onSuccess={() => router.refresh()} />
              <Button variant="outline" size="sm" className="gap-1.5" asChild>
                <a href="/api/admin/users/export" download>
                  <DownloadIcon data-icon="inline-start" />
                  Export CSV
                </a>
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-muted/20 p-3">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
              <InputGroup className="min-w-0 flex-1">
                <InputGroupAddon>
                  <Search data-icon="inline-start" />
                </InputGroupAddon>
                <InputGroupInput
                  type="search"
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder="Search by name or email..."
                  aria-label="Search users by name or email"
                />
                {searchValue && (
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => setSearchValue("")}
                      aria-label="Clear search"
                    >
                      <XIcon data-icon="inline-start" />
                    </InputGroupButton>
                  </InputGroupAddon>
                )}
              </InputGroup>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <ToggleGroup
                  type="single"
                  value={status}
                  onValueChange={(value) => updateFilter("status", value)}
                  spacing={0}
                  variant="outline"
                  size="sm"
                >
                  <ToggleGroupItem value="all">All</ToggleGroupItem>
                  <ToggleGroupItem value="active">Active</ToggleGroupItem>
                  <ToggleGroupItem value="banned">Banned</ToggleGroupItem>
                </ToggleGroup>
                <ToggleGroup
                  type="single"
                  value={plan}
                  onValueChange={(value) => updateFilter("plan", value)}
                  spacing={0}
                  variant="outline"
                  size="sm"
                >
                  <ToggleGroupItem value="all">All plans</ToggleGroupItem>
                  {planFilters.map((planFilter) => (
                    <ToggleGroupItem key={planFilter.value} value={planFilter.value}>
                      {planFilter.label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
                {hasFilters && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                {summary}
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="relative">
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <SortHeader
                      column="name"
                      label="User"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      query={query}
                      status={status}
                      plan={plan}
                    />
                    <SortHeader
                      column="email"
                      label="Email"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      query={query}
                      status={status}
                      plan={plan}
                    />
                    <TableHead>Status</TableHead>
                    <TableHead>Plan</TableHead>
                    <SortHeader
                      column="bookmarks"
                      label="Bookmarks"
                      align="right"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      query={query}
                      status={status}
                      plan={plan}
                    />
                    <SortHeader
                      column="joined"
                      label="Joined"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      query={query}
                      status={status}
                      plan={plan}
                    />
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="px-5 py-12">
                        <Empty className="py-8">
                          <EmptyHeader>
                            <EmptyMedia variant="icon">
                              <Search />
                            </EmptyMedia>
                            <EmptyTitle>No matching users</EmptyTitle>
                            <EmptyDescription>
                              {query
                                ? "Try a different name or email. Results update as you type."
                                : "User accounts will appear here once created."}
                            </EmptyDescription>
                          </EmptyHeader>
                        </Empty>
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user, index) => (
                      <TableRow key={user.id} className="border-border/60">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div
                              className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border text-xs font-semibold shadow-sm"
                              style={getUserAvatarStyle(getUserAvatarSeed(user.name, user.email))}
                              aria-label={`${user.name ?? user.email} avatar`}
                            >
                              {getUserInitials(user.name, user.email)}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-foreground">
                                {user.name ?? "Unnamed"}
                              </p>
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
                            <Badge variant="outline">
                              <ShieldCheck data-icon="inline-start" />
                              Admin
                            </Badge>
                          ) : user.isBanned ? (
                            <Badge variant="destructive">
                              <ShieldOffIcon data-icon="inline-start" />
                              Banned
                            </Badge>
                          ) : (
                            <Badge className="bg-success/10 text-success">
                              <UserCheckIcon data-icon="inline-start" />
                              Active
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              user.planSlug === "premium" ? "default" : "secondary"
                            }
                            className="capitalize"
                          >
                            {user.planDisplayName}
                          </Badge>
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
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8"
                                aria-label={`Actions for ${user.email}`}
                              >
                                <MoreHorizontalIcon />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuGroup>
                                <DropdownMenuItem
                                  onClick={() => setDetailUser(user)}
                                >
                                  <EyeIcon />
                                  View details
                                </DropdownMenuItem>
                              </DropdownMenuGroup>
                              <DropdownMenuSeparator />
                              <DropdownMenuGroup>
                                <DropdownMenuItem
                                  onClick={() =>
                                    user.isBanned
                                      ? handleQuickUnban(user.id)
                                      : handleQuickBan(user.id)
                                  }
                                  disabled={user.isCurrentAdmin || isPending}
                                >
                                  {user.isBanned ? (
                                    <ShieldCheck />
                                  ) : (
                                    <ShieldOffIcon />
                                  )}
                                  {user.isBanned
                                    ? "Lift suspension"
                                    : "Suspend 24h"}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => setTargetUser(user)}
                                  disabled={user.isCurrentAdmin || isPending}
                                >
                                  <Trash />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuGroup>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            {isPending && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-[1px]">
                <Spinner className="size-6" />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="whitespace-nowrap text-xs text-muted-foreground">
              Page <span className="font-medium text-foreground">{page}</span> of <span className="font-medium text-foreground">{totalPages}</span>
            </p>
            <Pagination className="justify-end">
              <PaginationContent>
                <PaginationItem>
                  {page > 1 ? (
                    <PaginationPrevious
                      href={buildUsersHref({
                        page: page - 1,
                        query,
                        status,
                        plan,
                        sortBy,
                        sortDir,
                      })}
                    />
                  ) : (
                    <Button
                      variant="outline"
                      size="default"
                      disabled
                      className="pl-1.5!"
                    >
                      <ArrowUpIcon data-icon="inline-start" className="rotate-[-90deg]" />
                      <span className="hidden sm:block">Previous</span>
                    </Button>
                  )}
                </PaginationItem>
                {paginationRange.map((item, index) =>
                  item === "ellipsis" ? (
                    <PaginationItem key={`ellipsis-${index}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={item}>
                      <PaginationLink
                        href={buildUsersHref({
                          page: item,
                          query,
                          status,
                          plan,
                          sortBy,
                          sortDir,
                        })}
                        isActive={item === page}
                      >
                        {item}
                      </PaginationLink>
                    </PaginationItem>
                  )
                )}
                <PaginationItem>
                  {page < totalPages ? (
                    <PaginationNext
                      href={buildUsersHref({
                        page: page + 1,
                        query,
                        status,
                        plan,
                        sortBy,
                        sortDir,
                      })}
                    />
                  ) : (
                    <Button
                      variant="outline"
                      size="default"
                      disabled
                      className="pr-1.5!"
                    >
                      <span className="hidden sm:block">Next</span>
                      <ArrowDownIcon data-icon="inline-end" className="rotate-[-90deg]" />
                    </Button>
                  )}
                </PaginationItem>
              </PaginationContent>
            </Pagination>
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
              {isPending ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <Trash data-icon="inline-start" />
              )}
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
