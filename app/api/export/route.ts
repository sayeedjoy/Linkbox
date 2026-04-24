import { NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { db, bookmarks, groups } from "@/lib/db";
import { isExtensionOrigin, resolveApiUserId } from "@/lib/api-auth";

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("Origin");
  if (origin && isExtensionOrigin(origin))
    return { "Access-Control-Allow-Origin": origin };
  return {};
}

export async function GET(request: Request) {
  const userId = await resolveApiUserId(request);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders(request) });

  const rows = await db
    .select({
      id: bookmarks.id,
      url: bookmarks.url,
      title: bookmarks.title,
      description: bookmarks.description,
      faviconUrl: bookmarks.faviconUrl,
      previewImageUrl: bookmarks.previewImageUrl,
      createdAt: bookmarks.createdAt,
      groupId: bookmarks.groupId,
      groupName: groups.name,
      groupColor: groups.color,
    })
    .from(bookmarks)
    .leftJoin(groups, eq(bookmarks.groupId, groups.id))
    .where(eq(bookmarks.userId, userId))
    .orderBy(desc(bookmarks.createdAt));

  const data = rows.map((b) => ({
    id: b.id,
    url: b.url,
    title: b.title,
    description: b.description,
    faviconUrl: b.faviconUrl,
    previewImageUrl: b.previewImageUrl,
    createdAt: b.createdAt.toISOString(),
    group: b.groupName ?? null,
    groupColor: b.groupColor ?? null,
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
  if (origin && isExtensionOrigin(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return new NextResponse(null, { status: 204, headers });
}
