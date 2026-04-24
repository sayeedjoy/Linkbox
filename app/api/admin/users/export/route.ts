import { NextResponse } from "next/server";
import { eq, asc, count } from "drizzle-orm";
import { requireAdminSession } from "@/lib/admin";
import { db, users, bookmarks, groups } from "@/lib/db";

export async function GET() {
  try {
    await requireAdminSession();
  } catch {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      autoGroupEnabled: users.autoGroupEnabled,
      createdAt: users.createdAt,
      bookmarkCount: count(bookmarks.id),
    })
    .from(users)
    .leftJoin(bookmarks, eq(bookmarks.userId, users.id))
    .groupBy(users.id)
    .orderBy(asc(users.createdAt));

  // Group counts require a separate subquery approach; fetch separately
  const groupCounts = await db
    .select({ userId: groups.userId, groupCount: count(groups.id) })
    .from(groups)
    .groupBy(groups.userId);
  const groupCountMap = new Map(groupCounts.map((r) => [r.userId, r.groupCount]));

  const headers = ["email", "name", "bookmarks", "groups", "autoGroupEnabled", "memberSince"];

  function escapeCsv(value: string | null | undefined): string {
    const str = value == null ? "" : String(value);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  const csvRows = rows.map((u) =>
    [
      escapeCsv(u.email),
      escapeCsv(u.name),
      u.bookmarkCount,
      groupCountMap.get(u.id) ?? 0,
      u.autoGroupEnabled ? "true" : "false",
      u.createdAt ? u.createdAt.toISOString().split("T")[0] : "",
    ].join(",")
  );

  const csv = [headers.join(","), ...csvRows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="linkarena-users-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
