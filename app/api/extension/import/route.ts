import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { and, eq, inArray, sql } from "drizzle-orm";
import { userIdFromBearerToken, isExtensionOrigin } from "@/lib/api-auth";
import { tryConsumeApiQuota } from "@/lib/api-quota";
import { getPlanFeaturesForUser } from "@/lib/plan-entitlements";
import { db, bookmarks, groups } from "@/lib/db";
import { publishUserEvent } from "@/lib/realtime";

const MAX_BROWSER_IMPORT = 2000;
const INSERT_CHUNK_SIZE = 500;
const IMPORTED_GROUP_NAME = "Imported - Browser";

type IncomingItem = {
  url?: unknown;
  title?: unknown;
  faviconUrl?: unknown;
  createdAt?: unknown;
};

type NormalizedItem = {
  url: string;
  title: string | null;
  faviconUrl: string | null;
  createdAt: Date | null;
};

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("Origin");
  if (origin?.startsWith("chrome-extension://"))
    return { "Access-Control-Allow-Origin": origin, Vary: "Origin" };
  return {};
}

function normalizeItem(raw: IncomingItem): NormalizedItem | null {
  if (typeof raw.url !== "string") return null;
  const url = raw.url.trim();
  if (!url || !/^https?:\/\//i.test(url)) return null;
  const title =
    typeof raw.title === "string" && raw.title.trim() ? raw.title.trim().slice(0, 1000) : null;
  const faviconUrl =
    typeof raw.faviconUrl === "string" && raw.faviconUrl.trim().startsWith("http")
      ? raw.faviconUrl.trim()
      : null;
  let createdAt: Date | null = null;
  if (typeof raw.createdAt === "string") {
    const parsed = new Date(raw.createdAt);
    if (!Number.isNaN(parsed.getTime())) createdAt = parsed;
  } else if (typeof raw.createdAt === "number" && Number.isFinite(raw.createdAt)) {
    createdAt = new Date(raw.createdAt);
  }
  return { url, title, faviconUrl, createdAt };
}

export async function POST(request: Request) {
  const headers = corsHeaders(request);

  if (!isExtensionOrigin(request.headers.get("Origin"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers });
  }

  const userId = await userIdFromBearerToken(request.headers.get("Authorization"));
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers });
  }

  const plan = await getPlanFeaturesForUser(userId);
  if (!plan.browserImportAllowed) {
    return NextResponse.json(
      { error: "Browser bookmark import requires a Pro plan." },
      { status: 403, headers }
    );
  }

  const quota = await tryConsumeApiQuota(userId, plan);
  if (!quota.ok) {
    return NextResponse.json(
      { error: "Daily API limit reached", limit: quota.limit, resetsAt: quota.resetsAt },
      { status: 429, headers }
    );
  }

  let body: { bookmarks?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers });
  }

  if (!Array.isArray(body.bookmarks)) {
    return NextResponse.json(
      { error: "Expected { bookmarks: [...] }" },
      { status: 400, headers }
    );
  }

  if (body.bookmarks.length > MAX_BROWSER_IMPORT) {
    return NextResponse.json(
      { error: `Import exceeds maximum of ${MAX_BROWSER_IMPORT} bookmarks per request` },
      { status: 400, headers }
    );
  }

  const normalized: NormalizedItem[] = [];
  const seenUrls = new Set<string>();
  let invalidCount = 0;
  for (const raw of body.bookmarks as IncomingItem[]) {
    const item = normalizeItem(raw ?? {});
    if (!item) {
      invalidCount += 1;
      continue;
    }
    if (seenUrls.has(item.url)) continue;
    seenUrls.add(item.url);
    normalized.push(item);
  }

  let groupId: string;
  let groupWasCreated = false;
  const createdBookmarkEvents: Array<{ id: string; groupId: string }> = [];
  let created = 0;
  let skipped = 0;

  await db.transaction(async (tx) => {
    const [existingGroup] = await tx
      .select({ id: groups.id })
      .from(groups)
      .where(and(eq(groups.userId, userId), eq(groups.name, IMPORTED_GROUP_NAME)))
      .limit(1);

    if (existingGroup) {
      groupId = existingGroup.id;
    } else {
      const [{ maxOrder }] = await tx
        .select({ maxOrder: sql<number>`coalesce(max(${groups.order}), -1)` })
        .from(groups)
        .where(eq(groups.userId, userId));
      const [createdGroup] = await tx
        .insert(groups)
        .values({
          userId,
          name: IMPORTED_GROUP_NAME,
          color: null,
          order: (maxOrder ?? -1) + 1,
        })
        .returning({ id: groups.id });
      groupId = createdGroup.id;
      groupWasCreated = true;
    }

    if (normalized.length === 0) return;

    const allUrls = normalized.map((n) => n.url);
    const existing = await tx
      .select({ url: bookmarks.url })
      .from(bookmarks)
      .where(
        and(
          eq(bookmarks.userId, userId),
          eq(bookmarks.groupId, groupId),
          inArray(bookmarks.url, allUrls)
        )
      );
    const existingUrls = new Set(existing.map((row) => row.url ?? ""));

    const toInsert = normalized.filter((item) => {
      if (existingUrls.has(item.url)) {
        skipped += 1;
        return false;
      }
      return true;
    });

    for (let i = 0; i < toInsert.length; i += INSERT_CHUNK_SIZE) {
      const chunk = toInsert.slice(i, i + INSERT_CHUNK_SIZE);
      const rows = await tx
        .insert(bookmarks)
        .values(
          chunk.map((item) => ({
            userId,
            groupId,
            url: item.url,
            title: item.title,
            description: null,
            faviconUrl: item.faviconUrl,
            previewImageUrl: null,
            source: "browser_import",
            ...(item.createdAt ? { createdAt: item.createdAt, updatedAt: item.createdAt } : {}),
          }))
        )
        .returning({ id: bookmarks.id });
      created += rows.length;
      for (const row of rows) {
        createdBookmarkEvents.push({ id: row.id, groupId });
      }
    }
  });

  if (groupWasCreated) {
    publishUserEvent(userId, { type: "group.created", entity: "group", id: groupId! });
  }
  for (const event of createdBookmarkEvents) {
    publishUserEvent(userId, {
      type: "bookmark.created",
      entity: "bookmark",
      id: event.id,
      data: { groupId: event.groupId },
    });
  }

  revalidatePath("/");
  revalidatePath("/timeline");
  revalidateTag("bookmarks", "max");
  revalidateTag("bookmark-count", "max");
  revalidateTag("groups", "max");

  return NextResponse.json(
    {
      created,
      updated: 0,
      skipped,
      invalidCount,
      groupId: groupId!,
      groupCreated: groupWasCreated,
    },
    { status: 200, headers }
  );
}

export async function OPTIONS(request: Request) {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "86400",
  };
  const origin = request.headers.get("Origin");
  if (origin?.startsWith("chrome-extension://")) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Vary"] = "Origin";
  }
  return new NextResponse(null, { status: 204, headers });
}
