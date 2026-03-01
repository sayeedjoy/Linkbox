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

export type AdminUserRow = {
  id: string;
  name: string | null;
  email: string;
  bookmarkCount: number;
  isCurrentAdmin: boolean;
};

type AdminUsersCardProps = {
  users: AdminUserRow[];
  query: string;
  page: number;
  totalPages: number;
  totalUsers: number;
};

function buildPageHref(page: number, query: string) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (page > 1) params.set("page", String(page));

  const search = params.toString();
  return search ? `/admin?${search}` : "/admin";
}

function initialsFor(name: string | null, email: string) {
  const source = name?.trim() || email.trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

export function AdminUsersCard({
  users,
  query,
  page,
  totalPages,
  totalUsers,
}: AdminUsersCardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [targetUser, setTargetUser] = useState<AdminUserRow | null>(null);
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
        <CardHeader className="space-y-4 border-b border-border pb-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <CardTitle>User Accounts</CardTitle>
              <CardDescription>
                Search, review, and manage registered accounts. The current
                admin account is protected.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="tabular-nums">
                {totalUsers} total
              </Badge>
              <Badge variant="secondary" className="tabular-nums">
                {users.length} visible
              </Badge>
            </div>
          </div>

          {/* Search bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Search by name or email..."
                className="pl-9"
                aria-label="Search users by name or email"
              />
            </div>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              {summary}
            </p>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-5 py-3 text-xs font-medium text-muted-foreground">
                    User
                  </th>
                  <th className="px-5 py-3 text-xs font-medium text-muted-foreground">
                    Email
                  </th>
                  <th className="px-5 py-3 text-xs font-medium text-muted-foreground">
                    Bookmarks
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-muted-foreground">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-16">
                      <div className="mx-auto max-w-sm text-center">
                        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-xl bg-muted">
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
                    </td>
                  </tr>
                ) : (
                  users.map((user, index) => (
                    <tr
                      key={user.id}
                      className="border-b border-border/50 transition-colors last:border-0 hover:bg-muted/50"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-semibold text-muted-foreground">
                            {initialsFor(user.name, user.email)}
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
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-xs text-foreground/80">
                          {user.email}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-baseline gap-1 tabular-nums">
                          <span className="text-sm font-semibold text-foreground">
                            {user.bookmarkCount}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            saved
                          </span>
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
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
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination footer */}
          <div className="flex flex-col gap-3 border-t border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
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
                  <Link href={buildPageHref(page - 1, query)}>
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
                  <Link href={buildPageHref(page + 1, query)}>
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
    </>
  );
}
