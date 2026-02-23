import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { prisma } from "@/lib/prisma";
import { userIdFromBearerToken } from "@/lib/api-auth";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  let userId = session?.user?.id;
  if (!userId) {
    const authHeader = request.headers.get("Authorization");
    userId = await userIdFromBearerToken(authHeader) ?? undefined;
  }
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
