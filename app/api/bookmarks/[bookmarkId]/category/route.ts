import { NextResponse } from "next/server";
import { userIdFromBearerToken } from "@/lib/api-auth";
import { updateBookmarkCategoryForUser } from "@/app/actions/bookmarks";

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("Origin");
  if (origin?.startsWith("chrome-extension://"))
    return { "Access-Control-Allow-Origin": origin };
  return {};
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ bookmarkId: string }> }
) {
  const userId = await userIdFromBearerToken(request.headers.get("Authorization"));
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders(request) });
  const { bookmarkId } = await params;
  if (!bookmarkId)
    return NextResponse.json({ error: "Bookmark id required" }, { status: 400, headers: corsHeaders(request) });
  let body: { categoryId?: string | null; groupId?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: corsHeaders(request) });
  }
  const raw = body?.categoryId !== undefined ? body.categoryId : body?.groupId;
  const categoryId = raw === undefined ? undefined : (raw === null || raw === "" ? null : (typeof raw === "string" ? raw : null));
  if (categoryId === undefined)
    return NextResponse.json({ error: "categoryId or groupId is required" }, { status: 400, headers: corsHeaders(request) });
  const updated = await updateBookmarkCategoryForUser(userId, bookmarkId, categoryId);
  if (!updated)
    return NextResponse.json({ error: "Bookmark not found" }, { status: 404, headers: corsHeaders(request) });
  return NextResponse.json(
    {
      id: updated.id,
      url: updated.url,
      title: updated.title,
      description: updated.description,
      faviconUrl: updated.faviconUrl,
      groupId: updated.groupId,
      group: updated.group,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    },
    { headers: corsHeaders(request) }
  );
}

export async function OPTIONS(request: Request) {
  const headers: Record<string, string> = { "Access-Control-Allow-Methods": "PUT, OPTIONS", "Access-Control-Allow-Headers": "Authorization, Content-Type", "Access-Control-Max-Age": "86400" };
  const origin = request.headers.get("Origin");
  if (origin?.startsWith("chrome-extension://")) headers["Access-Control-Allow-Origin"] = origin;
  return new NextResponse(null, { status: 204, headers });
}
