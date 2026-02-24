import { NextResponse } from "next/server";
import { userIdFromBearerToken } from "@/lib/api-auth";
import { createBookmarkFromMetadataForUser } from "@/app/actions/bookmarks";

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("Origin");
  if (origin?.startsWith("chrome-extension://"))
    return { "Access-Control-Allow-Origin": origin };
  return {};
}

export async function POST(request: Request) {
  const userId = await userIdFromBearerToken(request.headers.get("Authorization"));
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders(request) });
  let body: { url?: string; title?: string; description?: string; groupId?: string | null; faviconUrl?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: corsHeaders(request) });
  }
  const url = typeof body.url === "string" ? body.url.trim() : "";
  if (!url || !url.startsWith("http"))
    return NextResponse.json({ error: "Invalid URL" }, { status: 400, headers: corsHeaders(request) });
  const title = typeof body.title === "string" ? body.title : undefined;
  const description = typeof body.description === "string" ? body.description : undefined;
  const groupId = body.groupId === null || body.groupId === undefined ? undefined : (typeof body.groupId === "string" ? body.groupId : undefined);
  const faviconUrl = typeof body.faviconUrl === "string" && body.faviconUrl.trim().startsWith("http") ? body.faviconUrl.trim() : null;
  try {
    const bookmark = await createBookmarkFromMetadataForUser(
      userId,
      url,
      { title: title ?? null, description: description ?? null, faviconUrl, previewImageUrl: null },
      groupId ?? null
    );
    return NextResponse.json(bookmark, { status: 200, headers: corsHeaders(request) });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to create bookmark";
    return NextResponse.json({ error: message }, { status: 400, headers: corsHeaders(request) });
  }
}

export async function OPTIONS(request: Request) {
  const headers: Record<string, string> = { "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Authorization, Content-Type", "Access-Control-Max-Age": "86400" };
  const origin = request.headers.get("Origin");
  if (origin?.startsWith("chrome-extension://")) headers["Access-Control-Allow-Origin"] = origin;
  return new NextResponse(null, { status: 204, headers });
}
