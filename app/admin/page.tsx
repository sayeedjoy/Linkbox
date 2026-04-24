import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { cacheLife, cacheTag } from "next/cache";
import {
  ArrowLeftIcon,
  BookmarkIcon,
  FolderIcon,
  UsersIcon,
} from "lucide-react";
import { eq, count, sql, or, ilike, desc, asc } from "drizzle-orm";
import { db, users, bookmarks, groups } from "@/lib/db";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AdminFooter } from "@/components/admin/admin-footer";
import { PublicSignupCard } from "@/components/admin/public-signup-card";
import {
  AdminUsersCard,
  type AdminUserRow,
} from "@/components/admin/admin-users-card";
import { SystemHealthCard } from "@/components/admin/system-health-card";
import { ActivityChart, type ActivityDataPoint } from "@/components/admin/activity-chart";
import { TopDomainsCard } from "@/components/admin/top-domains-card";
import { isPublicSignupEnabled } from "@/lib/app-config";
import { requireAdminSession } from "@/lib/admin";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

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

const statIcons = [UsersIcon, BookmarkIcon, FolderIcon];
const statColors = [
  "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  "bg-amber-500/10 text-amber-600 dark:text-amber-400",
];

async function getAdminStats() {
  "use cache";
  cacheLife("minutes");
  cacheTag("admin-stats");

  const [[{ totalUsers }], [{ totalBookmarks }], [{ totalGroups }]] = await Promise.all([
    db.select({ totalUsers: count() }).from(users),
    db.select({ totalBookmarks: count() }).from(bookmarks),
    db.select({ totalGroups: count() }).from(groups),
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
    ],
    avgBookmarks,
  };
}

interface DayCountRow {
  day: string;
  count: number;
}

async function getActivityTimeline(): Promise<{
  data7d: ActivityDataPoint[];
  data30d: ActivityDataPoint[];
}> {
  "use cache";
  cacheLife("minutes");
  cacheTag("admin-stats");

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const result = await db.execute<{ day: string; count: string }>(
    sql`SELECT DATE_TRUNC('day', "createdAt")::date::text AS day, COUNT(*)::text AS count FROM "Bookmark" WHERE "createdAt" >= ${thirtyDaysAgo} GROUP BY day ORDER BY day ASC`
  );
  const rows: DayCountRow[] = result.rows.map((r) => ({ day: r.day, count: Number(r.count) }));

  const mapped = rows.map((r) => ({
    date: r.day.split("T")[0] as string,
    count: r.count,
  }));

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const data7d = mapped.filter((d) => new Date(d.date) >= sevenDaysAgo);

  return { data7d, data30d: mapped };
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
  const whereClause = query
    ? or(ilike(users.name, `%${query}%`), ilike(users.email, `%${query}%`))
    : undefined;

  const [{ totalUsers: totalUsersCount }] = await db.select({ totalUsers: count() }).from(users).where(whereClause);
  const totalPages = Math.max(1, Math.ceil(totalUsersCount / USERS_PER_PAGE));
  const page = Math.min(requestedPage, totalPages);
  const skip = (page - 1) * USERS_PER_PAGE;

  const userRows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      bannedUntil: users.bannedUntil,
      bookmarkCount: count(bookmarks.id),
    })
    .from(users)
    .leftJoin(bookmarks, eq(bookmarks.userId, users.id))
    .where(whereClause)
    .groupBy(users.id)
    .orderBy(desc(count(bookmarks.id)), asc(users.email))
    .limit(USERS_PER_PAGE)
    .offset(skip);

  const now = new Date();

  return {
    users: userRows.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      bookmarkCount: user.bookmarkCount,
      isCurrentAdmin: user.id === currentAdminId,
      isBanned: user.bannedUntil != null && user.bannedUntil > now,
    })),
    totalUsers: totalUsersCount,
    totalPages,
    page,
  };
}

function AdminSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} size="sm">
            <CardHeader className="pb-0">
              <div className="h-3 w-20 animate-pulse rounded bg-muted" />
            </CardHeader>
            <CardContent className="space-y-1.5">
              <div className="h-7 w-16 animate-pulse rounded bg-muted" />
              <div className="h-3 w-28 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
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
                  className="h-12 w-full animate-pulse rounded-lg bg-muted"
                />
              ))}
            </div>
          </CardContent>
        </Card>
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, index) => (
            <Card key={index} size="sm">
              <CardHeader className="pb-0">
                <div className="h-4 w-28 animate-pulse rounded bg-muted" />
              </CardHeader>
              <CardContent>
                <div className="h-16 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
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

  const [{ stats }, publicSignupEnabled, userData, activityData] =
    await Promise.all([
      getAdminStats(),
      isPublicSignupEnabled(),
      getAdminUsers(query, requestedPage, session.user.id),
      getActivityTimeline(),
    ]);

  return (
    <div className="space-y-4">
      {/* Stat cards + activity chart */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = statIcons[index] ?? UsersIcon;
          const colorClass = statColors[index] ?? statColors[0];
          return (
            <Card key={stat.label} size="sm">
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-0">
                <CardDescription className="text-xs font-medium uppercase tracking-widest">
                  {stat.label}
                </CardDescription>
                <div className={`flex size-7 items-center justify-center rounded-md ${colorClass}`}>
                  <Icon className="size-3.5" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-semibold tabular-nums tracking-tight text-foreground sm:text-2xl">
                  {stat.value.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  {stat.note}
                </p>
              </CardContent>
            </Card>
          );
        })}

        {/* Activity chart in 4th slot */}
        <ActivityChart
          data7d={activityData.data7d}
          data30d={activityData.data30d}
        />
      </div>

      {/* Main content grid: left (users + domains) + right sidebar */}
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-4">
          <AdminUsersCard
            users={userData.users}
            query={query}
            page={userData.page}
            totalPages={userData.totalPages}
            totalUsers={userData.totalUsers}
          />
          <TopDomainsCard />
        </div>

        <div className="space-y-3">
          <PublicSignupCard initialEnabled={publicSignupEnabled} />
          <SystemHealthCard />

          {/* Operational notes */}
          <Card size="sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Operational Notes</CardTitle>
              <CardDescription>
                Important reminders for admin actions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">
              <p>
                Deleting a user removes their bookmarks, groups, API tokens, and
                reset tokens through relational cascade.
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
      <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-4 sm:px-6 sm:py-6">
        {/* Page header */}
        <div className="mb-4 flex items-center gap-3">
          <Button variant="outline" size="icon" asChild className="shrink-0">
            <Link href="/dashboard" aria-label="Back to dashboard">
              <ArrowLeftIcon className="size-4" />
            </Link>
          </Button>
          <h1 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            Admin Console
          </h1>
        </div>

        <Suspense fallback={<AdminSkeleton />}>
          <AdminData searchParams={searchParams} />
        </Suspense>
      </div>

      <AdminFooter />
    </div>
  );
}
