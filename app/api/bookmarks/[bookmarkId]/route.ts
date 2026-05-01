import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { userIdFromBearerToken } from "@/lib/api-auth";
import { tryConsumeApiQuota } from "@/lib/api-quota";
import { refreshBookmarkForUser } from "@/app/actions/bookmarks";
import { db, bookmarks } from "@/lib/db";
import { publishUserEvent } from "@/lib/realtime";

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("Origin");
  if (origin?.startsWith("chrome-extension://"))
    return { "Access-Control-Allow-Origin": origin };
  return {};
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ bookmarkId: string }> }
) {
  const userId = await userIdFromBearerToken(request.headers.get("Authorization"));
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders(request) });
  const quota = await tryConsumeApiQuota(userId);
  if (!quota.ok) {
    return NextResponse.json(
      { error: "Daily API limit reached", limit: quota.limit, resetsAt: quota.resetsAt },
      { status: 429, headers: corsHeaders(request) }
    );
  }
  const { bookmarkId } = await params;
  if (!bookmarkId)
    return NextResponse.json({ error: "Bookmark id required" }, { status: 400, headers: corsHeaders(request) });

  const result = await db.delete(bookmarks).where(and(eq(bookmarks.id, bookmarkId), eq(bookmarks.userId, userId))).returning({ id: bookmarks.id });
  if (result.length === 0)
    return NextResponse.json({ error: "Bookmark not found" }, { status: 404, headers: corsHeaders(request) });

  publishUserEvent(userId, { type: "bookmark.deleted", entity: "bookmark", id: bookmarkId });
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ bookmarkId: string }> }
) {
  const userId = await userIdFromBearerToken(request.headers.get("Authorization"));
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders(request) });
  const { bookmarkId } = await params;
  if (!bookmarkId)
    return NextResponse.json({ error: "Bookmark id required" }, { status: 400, headers: corsHeaders(request) });
  const result = await refreshBookmarkForUser(userId, bookmarkId);
  if (!result.ok) {
    if (result.reason === "not_found")
      return NextResponse.json({ error: "Bookmark not found" }, { status: 404, headers: corsHeaders(request) });
    return NextResponse.json({ error: "Bookmark has no URL" }, { status: 422, headers: corsHeaders(request) });
  }
  return NextResponse.json(result.bookmark, { status: 200, headers: corsHeaders(request) });
}

export async function OPTIONS(request: Request) {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "86400",
  };
  const origin = request.headers.get("Origin");
  if (origin?.startsWith("chrome-extension://")) headers["Access-Control-Allow-Origin"] = origin;
  return new NextResponse(null, { status: 204, headers });
}
