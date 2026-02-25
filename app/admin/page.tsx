import { Suspense } from "react";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { cacheLife, cacheTag } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { prisma } from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon } from "lucide-react";

async function getAdminData() {
  "use cache";
  cacheLife("minutes");
  cacheTag("admin-stats");

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    totalBookmarks,
    totalGroups,
    newBookmarks7d,
    topUsers,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.bookmark.count(),
    prisma.group.count(),
    prisma.bookmark.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.user.findMany({
      select: {
        name: true,
        email: true,
        _count: { select: { bookmarks: true } },
      },
      orderBy: { bookmarks: { _count: "desc" } },
      take: 10,
    }),
  ]);

  const avgBookmarks =
    totalUsers > 0 ? (totalBookmarks / totalUsers).toFixed(1) : "0";

  const stats = [
    { label: "Total Users", value: totalUsers },
    { label: "Total Bookmarks", value: totalBookmarks },
    { label: "Total Groups", value: totalGroups },
    { label: "New Bookmarks (7d)", value: newBookmarks7d },
  ];

  const formattedTopUsers = topUsers.map((u) => ({
    name: u.name ?? "—",
    email: u.email,
    bookmarks: u._count.bookmarks,
  }));

  return {
    stats,
    avgBookmarks,
    topUsers: formattedTopUsers,
  };
}

function AdminSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} size="sm">
            <CardHeader className="pb-2">
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Top 10 Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-10 w-full animate-pulse rounded bg-muted"
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

async function AdminData() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/sign-in");
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  if (
    !adminEmail ||
    (session.user?.email ?? "").toLowerCase() !== adminEmail.toLowerCase()
  ) {
    notFound();
  }

  const { stats, avgBookmarks, topUsers } = await getAdminData();

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((stat) => (
          <Card key={stat.label} size="sm">
            <CardHeader className="pb-2">
              <CardDescription>{stat.label}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Avg Bookmarks per User</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">{avgBookmarks}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top 10 Users</CardTitle>
          <CardDescription>By bookmark count</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 pr-4 font-medium">Name</th>
                  <th className="pb-2 pr-4 font-medium">Email</th>
                  <th className="pb-2 font-medium">Bookmarks</th>
                </tr>
              </thead>
              <tbody>
                {topUsers.map((user) => (
                  <tr key={user.email} className="border-b last:border-0">
                    <td className="py-2 pr-4">{user.name}</td>
                    <td className="py-2 pr-4">{user.email}</td>
                    <td className="py-2">{user.bookmarks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/" aria-label="Back to dashboard">
              <ArrowLeftIcon className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">Admin</h1>
            <p className="text-sm text-muted-foreground">
              Usage statistics
            </p>
          </div>
        </div>

        <Suspense fallback={<AdminSkeleton />}>
          <AdminData />
        </Suspense>
      </div>
    </div>
  );
}
