import { unstable_cache } from "next/cache";
import { count, sql } from "drizzle-orm";
import { db, users, bookmarks, groups } from "@/lib/db";

const ADMIN_OVERVIEW_REVALIDATE_SECONDS = 180;

const cacheOptions = {
  tags: ["admin-stats"],
  revalidate: ADMIN_OVERVIEW_REVALIDATE_SECONDS,
};

export type AdminOverviewStatItem = {
  label: string;
  value: number | string;
  note: string;
};

export type AdminActivityDataPoint = {
  date: string;
  count: number;
};

export type AdminTopDomainsResult = {
  rows: { domain: string; count: number }[];
  total: number;
};

export const getCachedAdminOverviewStats = unstable_cache(
  async (): Promise<{ stats: AdminOverviewStatItem[] }> => {
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
        {
          label: "Avg/User",
          value: avgBookmarks,
          note: "Bookmarks per account",
        },
      ],
    };
  },
  ["admin-overview-stats"],
  cacheOptions
);

export const getCachedAdminActivityTimeline = unstable_cache(
  async (): Promise<{
    data7d: AdminActivityDataPoint[];
    data30d: AdminActivityDataPoint[];
  }> => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const result = await db.execute<{ day: string; count: string }>(
      sql`SELECT DATE_TRUNC('day', "createdAt")::date::text AS day, COUNT(*)::text AS count FROM "Bookmark" WHERE "createdAt" >= ${thirtyDaysAgo} GROUP BY day ORDER BY day ASC`
    );
    const mapped = result.rows.map((r) => ({
      date: r.day.split("T")[0] as string,
      count: Number(r.count),
    }));
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const data7d = mapped.filter((d) => new Date(d.date) >= sevenDaysAgo);
    return { data7d, data30d: mapped };
  },
  ["admin-overview-activity"],
  cacheOptions
);

export const getCachedAdminTopDomains = unstable_cache(
  async (): Promise<AdminTopDomainsResult> => {
    const limit = 10;
    const result = await db.execute<{ domain: string; count: string }>(
      sql`SELECT lower(regexp_replace(regexp_replace(url, '^https?://(www\.)?', ''), '[/?#].*$', '')) AS domain, COUNT(*)::text AS count FROM "Bookmark" WHERE url IS NOT NULL AND url <> '' GROUP BY domain ORDER BY count DESC LIMIT ${limit}`
    );
    const rows = result.rows.map((r) => ({
      domain: r.domain,
      count: Number(r.count),
    }));
    const total = rows.reduce((s, r) => s + r.count, 0);
    return { rows, total };
  },
  ["admin-overview-top-domains"],
  cacheOptions
);
