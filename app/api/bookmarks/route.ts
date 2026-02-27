import { NextResponse } from "next/server";
import { userIdFromBearerToken } from "@/lib/api-auth";
import { createBookmarkFromMetadataForUser } from "@/app/actions/bookmarks";
import { prisma } from "@/lib/prisma";
import { publishUserEvent } from "@/lib/realtime";

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("Origin");
  if (origin?.startsWith("chrome-extension://"))
    return { "Access-Control-Allow-Origin": origin };
  return {};
}

export async function PUT(request: Request) {
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
  const existing = await prisma.bookmark.findFirst({
    where: { url, userId },
    include: { group: { select: { id: true, name: true, color: true } } },
  });
  if (!existing)
    return NextResponse.json({ error: "Bookmark not found" }, { status: 404, headers: corsHeaders(request) });
  const updateData: { title?: string; description?: string; groupId?: string | null; faviconUrl?: string | null } = {};
  if (body.title !== undefined) updateData.title = typeof body.title === "string" ? body.title : null;
  if (body.description !== undefined) updateData.description = typeof body.description === "string" ? body.description : null;
  if (body.groupId !== undefined) updateData.groupId = body.groupId === null || body.groupId === undefined ? null : (typeof body.groupId === "string" ? body.groupId : null);
  if (body.faviconUrl !== undefined) updateData.faviconUrl = body.faviconUrl === null || body.faviconUrl === undefined ? null : (typeof body.faviconUrl === "string" && body.faviconUrl.trim().startsWith("http") ? body.faviconUrl.trim() : null);
  const updated = await prisma.bookmark.update({
    where: { id: existing.id },
    data: updateData,
    include: { group: { select: { id: true, name: true, color: true } } },
  });
  publishUserEvent(userId, {
    type: "bookmark.updated",
    entity: "bookmark",
    id: updated.id,
    data: { groupId: updated.groupId ?? null },
  });
  return NextResponse.json(updated, { status: 200, headers: corsHeaders(request) });
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

export async function DELETE(request: Request) {
  const userId = await userIdFromBearerToken(request.headers.get("Authorization"));
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders(request) });
  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: corsHeaders(request) });
  }
  const url = typeof body.url === "string" ? body.url.trim() : "";
  if (!url || !url.startsWith("http"))
    return NextResponse.json({ error: "Invalid URL" }, { status: 400, headers: corsHeaders(request) });
  const toDelete = await prisma.bookmark.findMany({
    where: { userId, url },
    select: { id: true },
  });
  const result = await prisma.bookmark.deleteMany({
    where: { userId, url },
  });
  if (result.count === 0)
    return NextResponse.json({ error: "Bookmark not found" }, { status: 404, headers: corsHeaders(request) });
  for (const bookmark of toDelete) {
    publishUserEvent(userId, {
      type: "bookmark.deleted",
      entity: "bookmark",
      id: bookmark.id,
    });
  }
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}

export async function OPTIONS(request: Request) {
  const headers: Record<string, string> = { "Access-Control-Allow-Methods": "POST, PUT, DELETE, OPTIONS", "Access-Control-Allow-Headers": "Authorization, Content-Type", "Access-Control-Max-Age": "86400" };
  const origin = request.headers.get("Origin");
  if (origin?.startsWith("chrome-extension://")) headers["Access-Control-Allow-Origin"] = origin;
  return new NextResponse(null, { status: 204, headers });
}
