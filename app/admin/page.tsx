import { Suspense } from "react";
import Link from "next/link";
import { cacheLife, cacheTag } from "next/cache";
import {
  ArrowLeftIcon,
  BookmarkIcon,
  FolderIcon,
  ShieldCheck,
  TrendingUpIcon,
  UsersIcon,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AdminFooter } from "@/components/admin/admin-footer";
import { PublicSignupCard } from "@/components/admin/public-signup-card";
import {
  AdminUsersCard,
  type AdminUserRow,
} from "@/components/admin/admin-users-card";
import { isPublicSignupEnabled } from "@/lib/app-config";
import { requireAdminSession } from "@/lib/admin";

const USERS_PER_PAGE = 20;

function firstParam(value: string | string[] | undefined): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value.length > 0) return value[0] ?? null;
  return null;
}

function parsePage(value: string | null): number {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

const statIcons = [UsersIcon, BookmarkIcon, FolderIcon, TrendingUpIcon];

async function getAdminStats() {
  "use cache";
  cacheLife("minutes");
  cacheTag("admin-stats");

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [totalUsers, totalBookmarks, totalGroups, newBookmarks7d] =
    await Promise.all([
      prisma.user.count(),
      prisma.bookmark.count(),
      prisma.group.count(),
      prisma.bookmark.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    ]);

  const avgBookmarks =
    totalUsers > 0 ? (totalBookmarks / totalUsers).toFixed(1) : "0";

  return {
    stats: [
      {
        label: "Total Users",
        value: totalUsers,
        note: "Registered accounts",
      },
      {
        label: "Bookmarks",
        value: totalBookmarks,
        note: "Across all users",
      },
      {
        label: "Groups",
        value: totalGroups,
        note: "Organizational folders",
      },
      {
        label: "7-Day Activity",
        value: newBookmarks7d,
        note: "New bookmarks this week",
      },
    ],
    avgBookmarks,
  };
}

async function getAdminUsers(
  query: string,
  requestedPage: number,
  currentAdminId: string
): Promise<{
  users: AdminUserRow[];
  totalUsers: number;
  totalPages: number;
  page: number;
}> {
  const where = query
    ? {
        OR: [
          { name: { contains: query, mode: "insensitive" as const } },
          { email: { contains: query, mode: "insensitive" as const } },
        ],
      }
    : undefined;

  const totalUsers = await prisma.user.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalUsers / USERS_PER_PAGE));
  const page = Math.min(requestedPage, totalPages);
  const skip = (page - 1) * USERS_PER_PAGE;

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      _count: { select: { bookmarks: true } },
    },
    orderBy: [{ bookmarks: { _count: "desc" } }, { email: "asc" }],
    skip,
    take: USERS_PER_PAGE,
  });

  return {
    users: users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      bookmarkCount: user._count.bookmarks,
      isCurrentAdmin: user.id === currentAdminId,
    })),
    totalUsers,
    totalPages,
    page,
  };
}

function AdminSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index}>
            <CardHeader className="pb-2">
              <div className="h-3 w-20 animate-pulse rounded bg-muted" />
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="h-8 w-16 animate-pulse rounded bg-muted" />
              <div className="h-3 w-28 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="h-5 w-32 animate-pulse rounded bg-muted" />
          <div className="h-3 w-64 animate-pulse rounded bg-muted" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="h-14 w-full animate-pulse rounded-lg bg-muted"
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

async function AdminData({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [session, params] = await Promise.all([
    requireAdminSession(),
    searchParams,
  ]);

  const query = (firstParam(params.q) ?? "").trim();
  const requestedPage = parsePage(firstParam(params.page));

  const [{ stats, avgBookmarks }, publicSignupEnabled, userData] =
    await Promise.all([
      getAdminStats(),
      isPublicSignupEnabled(),
      getAdminUsers(query, requestedPage, session.user.id),
    ]);

  return (
    <div className="space-y-8">
      {/* Hero header card */}
      <Card className="p-6 sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-start">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                  Admin Console
                </h1>
              </div>
            </div>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
              Monitor system activity, manage user accounts, and control
              registration settings from one place.
            </p>
          </div>

          {/* Summary pills */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-xl border border-border bg-muted/50 px-4 py-3">
              <p className="text-xs font-medium text-muted-foreground">
                Avg. bookmarks/user
              </p>
              <p className="mt-0.5 text-xl font-semibold tabular-nums tracking-tight text-foreground">
                {avgBookmarks}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-muted/50 px-4 py-3">
              <p className="text-xs font-medium text-muted-foreground">
                Registration
              </p>
              <p className="mt-0.5 text-sm font-semibold text-foreground">
                {publicSignupEnabled ? (
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block size-1.5 rounded-full bg-emerald-500" />
                    Open
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block size-1.5 rounded-full bg-muted-foreground" />
                    Private
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Stat cards row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = statIcons[index] ?? UsersIcon;
          return (
            <Card key={stat.label}>
              <CardHeader className="flex-row items-center justify-between pb-1">
                <CardDescription className="text-xs font-medium uppercase tracking-widest">
                  {stat.label}
                </CardDescription>
                <div className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Icon className="size-4" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
                  {stat.value.toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {stat.note}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main content grid */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <AdminUsersCard
          users={userData.users}
          query={query}
          page={userData.page}
          totalPages={userData.totalPages}
          totalUsers={userData.totalUsers}
        />

        <div className="space-y-6">
          <PublicSignupCard initialEnabled={publicSignupEnabled} />

          {/* Operational notes */}
          <Card>
            <CardHeader>
              <CardTitle>Operational Notes</CardTitle>
              <CardDescription>
                Important reminders for admin actions.
              </CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="space-y-3 pt-4 text-sm leading-relaxed text-muted-foreground">
              <p>
                Deleting a user removes their bookmarks, groups, API tokens, and
                reset tokens through the relational cascade.
              </p>
              <p>
                Live search updates the URL as you type, so filtered views
                remain shareable and reload safely.
              </p>
              <p>
                The current admin account is protected in both the UI and the
                server action.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        {/* Top nav bar */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              asChild
            >
              <Link href="/dashboard" aria-label="Back to dashboard">
                <ArrowLeftIcon className="size-4" />
              </Link>
            </Button>
            <div>
              <p className="text-sm font-medium text-foreground">
                Administration
              </p>
              <p className="text-xs text-muted-foreground">
                System overview & user management
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="gap-1.5">
            <ShieldCheck className="size-3" />
            Admin
          </Badge>
        </div>

        <Suspense fallback={<AdminSkeleton />}>
          <AdminData searchParams={searchParams} />
        </Suspense>
      </div>

      <AdminFooter />
    </div>
  );
}
