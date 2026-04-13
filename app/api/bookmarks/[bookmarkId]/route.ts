import { NextResponse } from "next/server";
import { userIdFromBearerToken } from "@/lib/api-auth";
import { refreshBookmarkForUser } from "@/app/actions/bookmarks";
import { prisma } from "@/lib/prisma";
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
  const { bookmarkId } = await params;
  if (!bookmarkId)
    return NextResponse.json({ error: "Bookmark id required" }, { status: 400, headers: corsHeaders(request) });
  const result = await prisma.bookmark.deleteMany({
    where: { id: bookmarkId, userId },
  });
  if (result.count === 0)
    return NextResponse.json({ error: "Bookmark not found" }, { status: 404, headers: corsHeaders(request) });
  publishUserEvent(userId, {
    type: "bookmark.deleted",
    entity: "bookmark",
    id: bookmarkId,
  });
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
