import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requireAdminSession();
  } catch {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const users = await prisma.user.findMany({
    select: {
      email: true,
      name: true,
      autoGroupEnabled: true,
      createdAt: true,
      _count: {
        select: {
          bookmarks: true,
          groups: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const headers = ["email", "name", "bookmarks", "groups", "autoGroupEnabled", "memberSince"];

  function escapeCsv(value: string | null | undefined): string {
    const str = value == null ? "" : String(value);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  const rows = users.map((u) =>
    [
      escapeCsv(u.email),
      escapeCsv(u.name),
      u._count.bookmarks,
      u._count.groups,
      u.autoGroupEnabled ? "true" : "false",
      u.createdAt ? u.createdAt.toISOString().split("T")[0] : "",
    ].join(",")
  );

  const csv = [headers.join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="linkarena-users-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
