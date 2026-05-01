import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { UsersIcon, BookmarkIcon, FolderIcon, RatioIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { ActivityChart } from "@/components/admin/activity-chart";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { TopDomainsCard } from "@/components/admin/top-domains-card";
import {
  getCachedAdminActivityTimeline,
  getCachedAdminOverviewStats,
  getCachedAdminTopDomains,
} from "@/lib/admin-overview-cache";

export const metadata: Metadata = { title: "Overview" };

const statIcons = [UsersIcon, BookmarkIcon, FolderIcon, RatioIcon];
const statColors = [
  "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
];

function firstParam(value: string | string[] | undefined): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value.length > 0) return value[0] ?? null;
  return null;
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
  await connection();
  const [{ stats }, activityData, topDomains] = await Promise.all([
    getCachedAdminOverviewStats(),
    getCachedAdminActivityTimeline(),
    getCachedAdminTopDomains(),
  ]);

  return (
    <div className="space-y-4">
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
                  {typeof stat.value === "number"
                    ? stat.value.toLocaleString()
                    : stat.value}
                </p>
                <p className="text-xs text-muted-foreground">{stat.note}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <ActivityChart data7d={activityData.data7d} data30d={activityData.data30d} />
        <TopDomainsCard rows={topDomains.rows} total={topDomains.total} />
      </div>
    </div>
  );
}

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const legacyUserParams = new URLSearchParams();

  for (const key of ["q", "page", "status", "sort"]) {
    const value = firstParam(params[key]);
    if (value) legacyUserParams.set(key, value);
  }

  if (legacyUserParams.size > 0) {
    redirect(`/admin/users?${legacyUserParams.toString()}`);
  }

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
