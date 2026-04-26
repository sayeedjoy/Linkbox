import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { count, sql } from "drizzle-orm";
import { UsersIcon, BookmarkIcon, FolderIcon } from "lucide-react";
import { db, users, bookmarks, groups } from "@/lib/db";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { ActivityChart, type ActivityDataPoint } from "@/components/admin/activity-chart";
import { AdminPageHeader } from "@/components/admin/admin-page-header";

export const metadata: Metadata = { title: "Overview" };

const statIcons = [UsersIcon, BookmarkIcon, FolderIcon];
const statColors = [
  "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  "bg-amber-500/10 text-amber-600 dark:text-amber-400",
];

async function getAdminStats() {
  const [[{ totalUsers }], [{ totalBookmarks }], [{ totalGroups }]] =
    await Promise.all([
      db.select({ totalUsers: count() }).from(users),
      db.select({ totalBookmarks: count() }).from(bookmarks),
      db.select({ totalGroups: count() }).from(groups),
    ]);

  const avgBookmarks =
    totalUsers > 0 ? (totalBookmarks / totalUsers).toFixed(1) : "0";

  return {
    stats: [
      { label: "Total Users", value: totalUsers, note: "Registered accounts" },
      { label: "Bookmarks", value: totalBookmarks, note: "Across all users" },
      { label: "Groups", value: totalGroups, note: "Organizational folders" },
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
  await connection();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const result = await db.execute<{ day: string; count: string }>(
    sql`SELECT DATE_TRUNC('day', "createdAt")::date::text AS day, COUNT(*)::text AS count FROM "Bookmark" WHERE "createdAt" >= ${thirtyDaysAgo} GROUP BY day ORDER BY day ASC`
  );
  const rows: DayCountRow[] = result.rows.map((r) => ({
    day: r.day,
    count: Number(r.count),
  }));
  const mapped = rows.map((r) => ({
    date: r.day.split("T")[0] as string,
    count: r.count,
  }));
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const data7d = mapped.filter((d) => new Date(d.date) >= sevenDaysAgo);
  return { data7d, data30d: mapped };
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} size="sm">
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
  );
}

async function OverviewData() {
  const [{ stats, avgBookmarks }, activityData] = await Promise.all([
    getAdminStats(),
    getActivityTimeline(),
  ]);

  return (
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
              <div
                className={`flex size-7 items-center justify-center rounded-md ${colorClass}`}
              >
                <Icon className="size-3.5" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-semibold tabular-nums tracking-tight text-foreground sm:text-2xl">
                {stat.value.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">{stat.note}</p>
            </CardContent>
          </Card>
        );
      })}

      <ActivityChart data7d={activityData.data7d} data30d={activityData.data30d} />
    </div>
  );
}

export default function AdminOverviewPage() {
  return (
    <div className="flex flex-col">
      <AdminPageHeader title="Overview" />
      <div className="flex-1 space-y-4 p-4 sm:p-6">
        <Suspense fallback={<StatsSkeleton />}>
          <OverviewData />
        </Suspense>
      </div>
    </div>
  );
}
