import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { userIdFromBearerToken } from "@/lib/api-auth";
import { tryConsumeApiQuota } from "@/lib/api-quota";
import { createBookmarkFromMetadataForUser } from "@/app/actions/bookmarks";
import { db, bookmarks, groups } from "@/lib/db";
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
  const quota = await tryConsumeApiQuota(userId);
  if (!quota.ok) {
    return NextResponse.json(
      { error: "Daily API limit reached", limit: quota.limit, resetsAt: quota.resetsAt },
      { status: 429, headers: corsHeaders(request) }
    );
  }
  let body: { url?: string; title?: string; description?: string; groupId?: string | null; faviconUrl?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: corsHeaders(request) });
  }
  const url = typeof body.url === "string" ? body.url.trim() : "";
  if (!url || !url.startsWith("http"))
    return NextResponse.json({ error: "Invalid URL" }, { status: 400, headers: corsHeaders(request) });

  const [existing] = await db
    .select({
      id: bookmarks.id,
      userId: bookmarks.userId,
      groupId: bookmarks.groupId,
      url: bookmarks.url,
      title: bookmarks.title,
      description: bookmarks.description,
      faviconUrl: bookmarks.faviconUrl,
      previewImageUrl: bookmarks.previewImageUrl,
      createdAt: bookmarks.createdAt,
      updatedAt: bookmarks.updatedAt,
      group: { id: groups.id, name: groups.name, color: groups.color },
    })
    .from(bookmarks)
    .leftJoin(groups, eq(bookmarks.groupId, groups.id))
    .where(and(eq(bookmarks.url, url), eq(bookmarks.userId, userId)))
    .limit(1);

  if (!existing)
    return NextResponse.json({ error: "Bookmark not found" }, { status: 404, headers: corsHeaders(request) });

  const updateData: { title?: string | null; description?: string | null; groupId?: string | null; faviconUrl?: string | null; updatedAt: Date } = { updatedAt: new Date() };
  if (body.title !== undefined) updateData.title = typeof body.title === "string" ? body.title : null;
  if (body.description !== undefined) updateData.description = typeof body.description === "string" ? body.description : null;
  if (body.groupId !== undefined) {
    if (body.groupId === null) {
      updateData.groupId = null;
    } else if (typeof body.groupId === "string") {
      const [group] = await db
        .select({ id: groups.id })
        .from(groups)
        .where(and(eq(groups.id, body.groupId), eq(groups.userId, userId)))
        .limit(1);
      if (!group)
        return NextResponse.json({ error: "Group not found" }, { status: 400, headers: corsHeaders(request) });
      updateData.groupId = group.id;
    } else {
      updateData.groupId = null;
    }
  }
  if (body.faviconUrl !== undefined) updateData.faviconUrl = body.faviconUrl === null || body.faviconUrl === undefined ? null : (typeof body.faviconUrl === "string" && body.faviconUrl.trim().startsWith("http") ? body.faviconUrl.trim() : null);

  await db.update(bookmarks).set(updateData).where(eq(bookmarks.id, existing.id));
  const [updated] = await db
    .select({
      id: bookmarks.id,
      userId: bookmarks.userId,
      groupId: bookmarks.groupId,
      url: bookmarks.url,
      title: bookmarks.title,
      description: bookmarks.description,
      faviconUrl: bookmarks.faviconUrl,
      previewImageUrl: bookmarks.previewImageUrl,
      createdAt: bookmarks.createdAt,
      updatedAt: bookmarks.updatedAt,
      group: { id: groups.id, name: groups.name, color: groups.color },
    })
    .from(bookmarks)
    .leftJoin(groups, eq(bookmarks.groupId, groups.id))
    .where(eq(bookmarks.id, existing.id))
    .limit(1);

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
  const quota = await tryConsumeApiQuota(userId);
  if (!quota.ok) {
    return NextResponse.json(
      { error: "Daily API limit reached", limit: quota.limit, resetsAt: quota.resetsAt },
      { status: 429, headers: corsHeaders(request) }
    );
  }
  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: corsHeaders(request) });
  }
  const url = typeof body.url === "string" ? body.url.trim() : "";
  if (!url || !url.startsWith("http"))
    return NextResponse.json({ error: "Invalid URL" }, { status: 400, headers: corsHeaders(request) });

  const toDelete = await db.select({ id: bookmarks.id }).from(bookmarks).where(and(eq(bookmarks.userId, userId), eq(bookmarks.url, url)));
  const result = await db.delete(bookmarks).where(and(eq(bookmarks.userId, userId), eq(bookmarks.url, url))).returning({ id: bookmarks.id });

  if (result.length === 0)
    return NextResponse.json({ error: "Bookmark not found" }, { status: 404, headers: corsHeaders(request) });

  for (const bookmark of toDelete) {
    publishUserEvent(userId, { type: "bookmark.deleted", entity: "bookmark", id: bookmark.id });
  }
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}

export async function OPTIONS(request: Request) {
  const headers: Record<string, string> = { "Access-Control-Allow-Methods": "POST, PUT, DELETE, OPTIONS", "Access-Control-Allow-Headers": "Authorization, Content-Type", "Access-Control-Max-Age": "86400" };
  const origin = request.headers.get("Origin");
  if (origin?.startsWith("chrome-extension://")) headers["Access-Control-Allow-Origin"] = origin;
  return new NextResponse(null, { status: 204, headers });
}
