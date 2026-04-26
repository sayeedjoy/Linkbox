import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { eq, count, or, ilike, desc, asc } from "drizzle-orm";
import { db, users, bookmarks } from "@/lib/db";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  AdminUsersCard,
  type AdminUserRow,
} from "@/components/admin/admin-users-card";
import { TopDomainsCard } from "@/components/admin/top-domains-card";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { requireAdminSession } from "@/lib/admin";

export const metadata: Metadata = { title: "Users" };

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

  const [{ totalUsers: totalUsersCount }] = await db
    .select({ totalUsers: count() })
    .from(users)
    .where(whereClause);
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

function UsersSkeleton() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="h-5 w-32 animate-pulse rounded bg-muted" />
          <div className="h-3 w-64 animate-pulse rounded bg-muted" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 w-full animate-pulse rounded-lg bg-muted" />
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

  const query = (firstParam(params.q) ?? "").trim();
  const requestedPage = parsePage(firstParam(params.page));
  const userData = await getAdminUsers(query, requestedPage, session.user.id);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <AdminUsersCard
        users={userData.users}
        query={query}
        page={userData.page}
        totalPages={userData.totalPages}
        totalUsers={userData.totalUsers}
      />
      <TopDomainsCard />
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
