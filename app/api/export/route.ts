import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const bookmarks = await prisma.bookmark.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      group: { select: { name: true, color: true } },
    },
  });
  const data = bookmarks.map((b) => ({
    url: b.url,
    title: b.title,
    description: b.description,
    faviconUrl: b.faviconUrl,
    previewImageUrl: b.previewImageUrl,
    createdAt: b.createdAt.toISOString(),
    group: b.group?.name ?? null,
    groupColor: b.group?.color ?? null,
  }));
  return NextResponse.json(data, {
    headers: {
      "Content-Disposition": 'attachment; filename="bookmarks.json"',
    },
  });
}
