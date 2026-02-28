import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isExtensionOrigin, resolveApiUserId } from "@/lib/api-auth";

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("Origin");
  if (isExtensionOrigin(origin))
    return { "Access-Control-Allow-Origin": origin };
  return {};
}

export async function GET(request: Request) {
  const userId = await resolveApiUserId(request);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders(request) });
  const bookmarks = await prisma.bookmark.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      group: { select: { name: true, color: true } },
    },
  });
  const data = bookmarks.map((b) => ({
    id: b.id,
    url: b.url,
    title: b.title,
    description: b.description,
    faviconUrl: b.faviconUrl,
    previewImageUrl: b.previewImageUrl,
    createdAt: b.createdAt.toISOString(),
    group: b.group?.name ?? null,
    groupColor: b.group?.color ?? null,
    groupId: b.groupId ?? null,
  }));
  return NextResponse.json(data, {
    headers: {
      "Content-Disposition": 'attachment; filename="bookmarks.json"',
      ...corsHeaders(request),
    },
  });
}

export async function OPTIONS(request: Request) {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "86400",
  };
  const origin = request.headers.get("Origin");
  if (isExtensionOrigin(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return new NextResponse(null, { status: 204, headers });
}
