import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { prisma } from "@/lib/prisma";
import { userIdFromBearerToken } from "@/lib/api-auth";

const DEFAULT_INITIAL_SYNC_LIMIT = 150;
const MAX_SYNC_LIMIT = 2000;

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("Origin");
  if (origin?.startsWith("chrome-extension://"))
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

  const authHeader = request.headers.get("Authorization");
  let userId = (await userIdFromBearerToken(authHeader)) ?? undefined;
  if (!userId) {
    const session = await getServerSession(authOptions);
    userId = session?.user?.id;
  }
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders(request) });

  const shouldPaginate = mode === "initial" || !!cursor || requestedLimit !== null;
  const resolvedLimit = Math.min(
    requestedLimit ?? (mode === "initial" ? DEFAULT_INITIAL_SYNC_LIMIT : MAX_SYNC_LIMIT),
    MAX_SYNC_LIMIT
  );

  const [bookmarks, groups] = await Promise.all([
    prisma.bookmark.findMany({
      where: { userId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: shouldPaginate ? resolvedLimit + 1 : undefined,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        group: { select: { name: true, color: true } },
      },
    }),
    prisma.group.findMany({
      where: { userId },
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        color: true,
        order: true,
        _count: { select: { bookmarks: true } },
      },
    }),
  ]);

  const hasMore = shouldPaginate && bookmarks.length > resolvedLimit;
  const pageRows = shouldPaginate ? bookmarks.slice(0, resolvedLimit) : bookmarks;

  const bookmarkData = pageRows.map((b) => ({
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

  const nextCursor =
    hasMore && pageRows.length > 0 ? pageRows[pageRows.length - 1].id : null;

  return NextResponse.json(
    {
      bookmarks: bookmarkData,
      groups,
      partial: hasMore,
      hasMore,
      nextCursor,
    },
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
  if (origin?.startsWith("chrome-extension://")) headers["Access-Control-Allow-Origin"] = origin;
  return new NextResponse(null, { status: 204, headers });
}
