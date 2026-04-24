import { NextResponse } from "next/server";
import { eq, desc, asc, count } from "drizzle-orm";
import { db, bookmarks, groups } from "@/lib/db";
import { isExtensionOrigin, resolveApiUserId } from "@/lib/api-auth";

const DEFAULT_INITIAL_SYNC_LIMIT = 150;
const MAX_SYNC_LIMIT = 2000;

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("Origin");
  if (origin && isExtensionOrigin(origin))
    return { "Access-Control-Allow-Origin": origin };
  return {};
}

function parsePositiveInt(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("mode") === "initial" ? "initial" : "full";
  const cursor = url.searchParams.get("cursor");
  const requestedLimit = parsePositiveInt(url.searchParams.get("limit"));

  const userId = await resolveApiUserId(request);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders(request) });

  const shouldPaginate = mode === "initial" || !!cursor || requestedLimit !== null;
  const resolvedLimit = Math.min(
    requestedLimit ?? (mode === "initial" ? DEFAULT_INITIAL_SYNC_LIMIT : MAX_SYNC_LIMIT),
    MAX_SYNC_LIMIT
  );

  const bookmarkQuery = db
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
    .orderBy(desc(bookmarks.createdAt), desc(bookmarks.id));

  if (shouldPaginate) bookmarkQuery.limit(resolvedLimit + 1);

  const groupsWithCount = await db
    .select({
      id: groups.id,
      name: groups.name,
      color: groups.color,
      order: groups.order,
      bookmarkCount: count(bookmarks.id),
    })
    .from(groups)
    .leftJoin(bookmarks, eq(bookmarks.groupId, groups.id))
    .where(eq(groups.userId, userId))
    .groupBy(groups.id)
    .orderBy(asc(groups.order), asc(groups.name));

  const bookmarkRows = await bookmarkQuery;

  const hasMore = shouldPaginate && bookmarkRows.length > resolvedLimit;
  const pageRows = shouldPaginate ? bookmarkRows.slice(0, resolvedLimit) : bookmarkRows;

  const bookmarkData = pageRows.map((b) => ({
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

  const nextCursor =
    hasMore && pageRows.length > 0 ? pageRows[pageRows.length - 1]!.id : null;

  const groupData = groupsWithCount.map((g) => ({
    id: g.id,
    name: g.name,
    color: g.color,
    order: g.order,
    _count: { bookmarks: g.bookmarkCount },
  }));

  return NextResponse.json(
    { bookmarks: bookmarkData, groups: groupData, partial: hasMore, hasMore, nextCursor },
    { headers: corsHeaders(request) }
  );
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
