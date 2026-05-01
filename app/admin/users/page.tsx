import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  ilike,
  inArray,
  isNull,
  lte,
  or,
  sql,
} from "drizzle-orm";
import { db, users, bookmarks, subscriptionPlans } from "@/lib/db";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AdminUsersCard,
  type AdminUserRow,
} from "@/components/admin/admin-users-card";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { requireAdminSession } from "@/lib/admin";

export const metadata: Metadata = { title: "Users" };

const USERS_PER_PAGE = 20;
const STATUS_FILTERS = ["all", "active", "banned"] as const;
const SORT_BY_COLUMNS = ["name", "email", "bookmarks", "joined"] as const;
const SORT_DIRS = ["asc", "desc"] as const;

type UserStatusFilter = (typeof STATUS_FILTERS)[number];
type UserPlanFilter = string;
type SortByColumn = (typeof SORT_BY_COLUMNS)[number];
type SortDir = (typeof SORT_DIRS)[number];

function firstParam(value: string | string[] | undefined): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value.length > 0) return value[0] ?? null;
  return null;
}

function parsePage(value: string | null): number {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function parseStatus(value: string | null): UserStatusFilter {
  return STATUS_FILTERS.includes(value as UserStatusFilter)
    ? (value as UserStatusFilter)
    : "all";
}

function parsePlan(value: string | null, allowedPlanSlugs: string[]): UserPlanFilter {
  if (value === "all") return "all";
  if (!value) return "all";
  return allowedPlanSlugs.includes(value) ? value : "all";
}

function parseSortBy(value: string | null): SortByColumn | null {
  return SORT_BY_COLUMNS.includes(value as SortByColumn)
    ? (value as SortByColumn)
    : null;
}

function parseSortDir(value: string | null): SortDir | null {
  return SORT_DIRS.includes(value as SortDir) ? (value as SortDir) : null;
}

async function getAdminUsers(
  query: string,
  status: UserStatusFilter,
  plan: UserPlanFilter,
  sortBy: SortByColumn | null,
  sortDir: SortDir | null,
  requestedPage: number,
  currentAdminId: string
): Promise<{
  users: AdminUserRow[];
  totalUsers: number;
  totalPages: number;
  page: number;
  stats: {
    totalUsers: number;
    activeCount: number;
    bannedCount: number;
    totalBookmarks: number;
  };
}> {
  const now = new Date();
  const searchClause = query
    ? or(ilike(users.name, `%${query}%`), ilike(users.email, `%${query}%`))
    : undefined;
  const statusClause =
    status === "banned"
      ? gt(users.bannedUntil, now)
      : status === "active"
        ? or(isNull(users.bannedUntil), lte(users.bannedUntil, now))
        : undefined;
  const planClause =
    plan === "all" ? undefined : eq(subscriptionPlans.slug, plan);
  const whereClause = and(searchClause, statusClause, planClause);

  const activeClause = or(isNull(users.bannedUntil), lte(users.bannedUntil, now));
  const bannedClause = gt(users.bannedUntil, now);

  const bookmarksPerUserSql = sql<number>`(SELECT COUNT(*)::int FROM ${bookmarks} WHERE ${bookmarks.userId} = ${users.id})`;

  const effectiveSortBy = sortBy ?? "joined";
  const effectiveSortDir = sortDir ?? "desc";

  const orderBy =
    effectiveSortBy === "name"
      ? effectiveSortDir === "asc"
        ? [asc(users.name), asc(users.email)]
        : [desc(users.name), asc(users.email)]
      : effectiveSortBy === "email"
        ? effectiveSortDir === "asc"
          ? [asc(users.email), asc(users.name)]
          : [desc(users.email), asc(users.name)]
        : effectiveSortBy === "bookmarks"
          ? effectiveSortDir === "asc"
            ? [asc(bookmarksPerUserSql), asc(users.email)]
            : [desc(bookmarksPerUserSql), asc(users.email)]
          : effectiveSortDir === "asc"
            ? [asc(users.createdAt), asc(users.email)]
            : [desc(users.createdAt), asc(users.email)];

  const filteredUserIds = db
    .select({ id: users.id })
    .from(users)
    .innerJoin(subscriptionPlans, eq(users.subscriptionPlanId, subscriptionPlans.id))
    .where(whereClause);

  const [
    [{ totalUsers: totalUsersCount }],
    [{ totalBookmarks }],
    [{ activeCount }],
    [{ bannedCount }],
  ] = await Promise.all([
    db
      .select({ totalUsers: count() })
      .from(users)
      .innerJoin(subscriptionPlans, eq(users.subscriptionPlanId, subscriptionPlans.id))
      .where(whereClause),
    db
      .select({ totalBookmarks: count(bookmarks.id) })
      .from(bookmarks)
      .where(inArray(bookmarks.userId, filteredUserIds)),
    db
      .select({ activeCount: count() })
      .from(users)
      .innerJoin(subscriptionPlans, eq(users.subscriptionPlanId, subscriptionPlans.id))
      .where(and(searchClause, activeClause, planClause)),
    db
      .select({ bannedCount: count() })
      .from(users)
      .innerJoin(subscriptionPlans, eq(users.subscriptionPlanId, subscriptionPlans.id))
      .where(and(searchClause, bannedClause, planClause)),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalUsersCount / USERS_PER_PAGE));
  const page = Math.min(requestedPage, totalPages);
  const skip = (page - 1) * USERS_PER_PAGE;

  const userRows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      createdAt: users.createdAt,
      bannedUntil: users.bannedUntil,
      bookmarkCount: bookmarksPerUserSql.mapWith(Number),
      planSlug: subscriptionPlans.slug,
      planDisplayName: subscriptionPlans.displayName,
    })
    .from(users)
    .innerJoin(subscriptionPlans, eq(users.subscriptionPlanId, subscriptionPlans.id))
    .where(whereClause)
    .orderBy(...orderBy)
    .limit(USERS_PER_PAGE)
    .offset(skip);

  return {
    users: userRows.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt.toISOString(),
      bookmarkCount: user.bookmarkCount,
      isCurrentAdmin: user.id === currentAdminId,
      isBanned: user.bannedUntil != null && user.bannedUntil > now,
      planSlug: user.planSlug,
      planDisplayName: user.planDisplayName,
    })),
    totalUsers: totalUsersCount,
    totalPages,
    page,
    stats: {
      totalUsers: totalUsersCount,
      activeCount,
      bannedCount,
      totalBookmarks: Number(totalBookmarks),
    },
  };
}

function UsersSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} size="sm">
            <CardContent className="flex flex-col gap-2 py-3">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-7 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader className="gap-4 border-b border-border pb-4">
          <div className="flex flex-col gap-0.5">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-64" />
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 p-0">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

async function UsersData({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const [session, params] = await Promise.all([
    requireAdminSession(),
    searchParams,
  ]);
  const availablePlans = await db
    .select({ slug: subscriptionPlans.slug, displayName: subscriptionPlans.displayName })
    .from(subscriptionPlans)
    .orderBy(subscriptionPlans.sortOrder);
  const planFilters = availablePlans.map((p) => ({ value: p.slug, label: p.displayName }));

  const query = (firstParam(params.q) ?? "").trim();
  const status = parseStatus(firstParam(params.status));
  const plan = parsePlan(firstParam(params.plan), planFilters.map((p) => p.value));
  const sortBy = parseSortBy(firstParam(params.sortBy));
  const sortDir = parseSortDir(firstParam(params.sortDir));
  const requestedPage = parsePage(firstParam(params.page));
  const userData = await getAdminUsers(
    query,
    status,
    plan,
    sortBy,
    sortDir,
    requestedPage,
    session.user.id
  );

  return (
    <div className="flex flex-col gap-4">
      <AdminUsersCard
        users={userData.users}
        query={query}
        status={status}
        plan={plan}
        sortBy={sortBy}
        sortDir={sortDir}
        page={userData.page}
        totalPages={userData.totalPages}
        totalUsers={userData.totalUsers}
        stats={userData.stats}
        planFilters={planFilters}
      />
    </div>
  );
}

export default function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <div className="flex flex-col">
      <AdminPageHeader
        title="Users"
        description="Manage registered accounts"
      />
      <div className="flex-1 p-4 sm:p-6">
        <Suspense fallback={<UsersSkeleton />}>
          <UsersData searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}
