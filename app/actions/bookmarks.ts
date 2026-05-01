"use server";

import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import {
  eq, and, or, ilike, isNull, desc, asc, sql, count, inArray,
} from "drizzle-orm";
import { db, bookmarks, groups } from "@/lib/db";
import { currentUserId } from "@/lib/auth";
import { unfurlUrl } from "@/app/actions/parse";
import { publishUserEvent, type RealtimeEventType } from "@/lib/realtime";
import { categorizeBookmark } from "@/app/actions/categorize";
import { consumeApiQuotaOrThrow } from "@/lib/api-quota";
import { getPlanFeaturesForUser, resolveGroupColorForPlan } from "@/lib/plan-entitlements";

export type BookmarkWithGroup = typeof bookmarks.$inferSelect & {
  group: { id: string; name: string; color: string | null } | null;
};

export type RefreshBookmarkForUserResult =
  | { ok: true; bookmark: BookmarkWithGroup }
  | { ok: false; reason: "not_found" | "missing_url" };

export type ImportBookmarkItem = {
  url: string;
  title?: string | null;
  description?: string | null;
  faviconUrl?: string | null;
  previewImageUrl?: string | null;
  group?: string | null;
  groupColor?: string | null;
  createdAt?: string | null;
};

const MAX_IMPORT_ITEMS = 5000;

function revalidateBookmarkData() {
  revalidatePath("/");
  revalidatePath("/timeline");
  revalidateTag("bookmarks", "max");
  revalidateTag("bookmark-count", "max");
  revalidateTag("groups", "max");
}

function publishBookmarkEvent(
  userId: string,
  type: RealtimeEventType,
  id: string,
  data?: Record<string, unknown>
) {
  publishUserEvent(userId, { type, entity: "bookmark", id, data });
}

function touchBookmark() {
  return { updatedAt: new Date() };
}

async function resolveGroupIdForUser(userId: string, groupId: string | null | undefined) {
  if (!groupId) return null;
  const [group] = await db
    .select({ id: groups.id })
    .from(groups)
    .where(and(eq(groups.id, groupId), eq(groups.userId, userId)))
    .limit(1);
  if (!group) throw new Error("Group not found");
  return group.id;
}

function normalizeImportBookmarkItem(item: ImportBookmarkItem) {
  const url = typeof item.url === "string" ? item.url.trim() : "";
  const title = typeof item.title === "string" ? item.title : null;
  const description = typeof item.description === "string" ? item.description : null;
  const faviconUrl = typeof item.faviconUrl === "string" ? item.faviconUrl : null;
  const previewImageUrl = typeof item.previewImageUrl === "string" ? item.previewImageUrl : null;
  const groupName = typeof item.group === "string" ? item.group.trim() : "";
  const groupColor = typeof item.groupColor === "string" ? item.groupColor : null;
  const isNote = !url && !!description;
  let createdAt: Date | null = null;
  if (typeof item.createdAt === "string") {
    const parsed = new Date(item.createdAt);
    if (!isNaN(parsed.getTime())) createdAt = parsed;
  }
  return { url, title, description, faviconUrl, previewImageUrl, groupName: groupName || null, groupColor, isNote, createdAt };
}

export async function previewImportBookmarks(items: ImportBookmarkItem[]) {
  const userId = await currentUserId();
  if (!Array.isArray(items)) return { total: 0, duplicateCount: 0, invalidCount: 0 };
  if (items.length > MAX_IMPORT_ITEMS) {
    return { total: items.length, duplicateCount: 0, invalidCount: 0, error: `Import exceeds maximum of ${MAX_IMPORT_ITEMS} items` };
  }

  const groupList = await db.select({ id: groups.id, name: groups.name }).from(groups).where(eq(groups.userId, userId));
  const groupByName = new Map<string, string>();
  for (const g of groupList) groupByName.set(g.name.trim().toLowerCase(), g.id);

  const normalizedItems = items.map(normalizeImportBookmarkItem);

  const pendingGroupNames = new Set<string>();
  for (const item of normalizedItems) {
    if (!item.groupName) continue;
    const key = item.groupName.toLowerCase();
    if (!groupByName.has(key)) pendingGroupNames.add(key);
  }

  const validUrls = Array.from(new Set(normalizedItems.filter((item) => item.url && item.url.startsWith("http")).map((item) => item.url)));
  const existingBookmarks = validUrls.length
    ? await db.select({ id: bookmarks.id, url: bookmarks.url, groupId: bookmarks.groupId }).from(bookmarks).where(and(eq(bookmarks.userId, userId), inArray(bookmarks.url, validUrls)))
    : [];
  const existingByKey = new Map<string, string>();
  for (const bookmark of existingBookmarks) {
    existingByKey.set(`${bookmark.url}::${bookmark.groupId ?? "null"}`, bookmark.id);
  }

  const existingNotes = await db.select({ id: bookmarks.id, title: bookmarks.title, groupId: bookmarks.groupId }).from(bookmarks).where(and(eq(bookmarks.userId, userId), isNull(bookmarks.url)));
  const existingNoteByKey = new Map<string, string>();
  for (const note of existingNotes) {
    existingNoteByKey.set(`${note.title ?? ""}::${note.groupId ?? "null"}`, note.id);
  }

  let total = 0;
  let invalidCount = 0;
  let duplicateCount = 0;
  const seenKeys = new Set<string>();

  for (const item of normalizedItems) {
    total += 1;
    const isValidUrl = item.url && item.url.startsWith("http");
    if (!isValidUrl && !item.isNote) { invalidCount += 1; continue; }

    let groupId: string | null = null;
    if (item.groupName) {
      const key = item.groupName.toLowerCase();
      if (groupByName.has(key)) groupId = groupByName.get(key)!;
      else if (pendingGroupNames.has(key)) groupId = `__pending__${key}`;
    }

    let dedupKey: string;
    if (item.isNote) {
      const noteTitle = item.description?.split(/\r?\n/)[0]?.slice(0, 500) ?? "Note";
      dedupKey = `note::${noteTitle}::${groupId ?? "null"}`;
      if (!groupId?.startsWith("__pending__")) {
        const noteKey = `${noteTitle}::${groupId ?? "null"}`;
        if (existingNoteByKey.has(noteKey)) { if (!seenKeys.has(dedupKey)) duplicateCount += 1; }
      }
    } else {
      dedupKey = `${item.url}::${groupId ?? "null"}`;
      if (!groupId?.startsWith("__pending__") && existingByKey.has(dedupKey)) { if (!seenKeys.has(dedupKey)) duplicateCount += 1; }
    }

    if (seenKeys.has(dedupKey)) duplicateCount += 1;
    seenKeys.add(dedupKey);
  }

  return { total, duplicateCount, invalidCount };
}

export async function importBookmarks(items: ImportBookmarkItem[]) {
  const userId = await currentUserId();
  if (!Array.isArray(items)) return { error: "Invalid import payload" };
  if (items.length > MAX_IMPORT_ITEMS) return { error: `Import exceeds maximum of ${MAX_IMPORT_ITEMS} items` };
  const planFeatures = await getPlanFeaturesForUser(userId);
  await consumeApiQuotaOrThrow(userId, planFeatures);

  const groupList = await db.select({ id: groups.id, name: groups.name }).from(groups).where(eq(groups.userId, userId));
  const groupByName = new Map<string, string>();
  for (const g of groupList) groupByName.set(g.name.trim().toLowerCase(), g.id);

  const normalizedItems = items.map(normalizeImportBookmarkItem);
  const validUrls = Array.from(new Set(normalizedItems.filter((item) => item.url && item.url.startsWith("http")).map((item) => item.url)));
  const pendingGroupCreates = new Map<string, { name: string; color: string | null }>();
  for (const item of normalizedItems) {
    if (!item.groupName) continue;
    const key = item.groupName.toLowerCase();
    if (groupByName.has(key) || pendingGroupCreates.has(key)) continue;
    pendingGroupCreates.set(key, {
      name: item.groupName,
      color: resolveGroupColorForPlan(planFeatures.groupColoringAllowed, item.groupColor),
    });
  }

  const existingBookmarkRows = validUrls.length
    ? await db.select({ id: bookmarks.id, url: bookmarks.url, groupId: bookmarks.groupId }).from(bookmarks).where(and(eq(bookmarks.userId, userId), inArray(bookmarks.url, validUrls)))
    : [];
  const existingByKey = new Map<string, string>();
  for (const bookmark of existingBookmarkRows) {
    existingByKey.set(`${bookmark.url}::${bookmark.groupId ?? "null"}`, bookmark.id);
  }

  const existingNotes = await db.select({ id: bookmarks.id, title: bookmarks.title, groupId: bookmarks.groupId }).from(bookmarks).where(and(eq(bookmarks.userId, userId), isNull(bookmarks.url)));
  const existingNoteByKey = new Map<string, string>();
  for (const note of existingNotes) {
    existingNoteByKey.set(`${note.title ?? ""}::${note.groupId ?? "null"}`, note.id);
  }

  let created = 0;
  let updated = 0;
  let invalidCount = 0;
  const createdGroupIds: string[] = [];
  const createdBookmarkEvents: Array<{ id: string; groupId: string | null }> = [];
  const updatedBookmarkEvents: Array<{ id: string; groupId: string | null }> = [];

  await db.transaction(async (tx) => {
    const [{ maxOrder }] = await tx
      .select({ maxOrder: sql<number>`coalesce(max(${groups.order}), -1)` })
      .from(groups)
      .where(eq(groups.userId, userId));
    let nextOrder = (maxOrder ?? -1) + 1;

    for (const [key, groupData] of pendingGroupCreates.entries()) {
      const [createdGroup] = await tx
        .insert(groups)
        .values({ userId, name: groupData.name, color: groupData.color, order: nextOrder })
        .returning({ id: groups.id });
      nextOrder += 1;
      groupByName.set(key, createdGroup.id);
      createdGroupIds.push(createdGroup.id);
    }

    for (const item of normalizedItems) {
      const isValidUrl = item.url && item.url.startsWith("http");
      if (!isValidUrl && !item.isNote) { invalidCount += 1; continue; }
      const groupId = item.groupName ? (groupByName.get(item.groupName.toLowerCase()) ?? null) : null;

      if (item.isNote) {
        const noteTitle = item.description?.split(/\r?\n/)[0]?.slice(0, 500) ?? "Note";
        const noteKey = `${noteTitle}::${groupId ?? "null"}`;
        const existingNoteId = existingNoteByKey.get(noteKey);
        if (existingNoteId) {
          await tx.update(bookmarks).set({ groupId, title: noteTitle, description: item.description, ...touchBookmark() }).where(eq(bookmarks.id, existingNoteId));
          updated += 1;
          updatedBookmarkEvents.push({ id: existingNoteId, groupId });
        } else {
          const timestamp = item.createdAt ?? new Date();
          const [note] = await tx.insert(bookmarks).values({
            userId, groupId, url: null, title: noteTitle, description: item.description,
            faviconUrl: null, previewImageUrl: null,
            createdAt: timestamp,
            updatedAt: timestamp,
          }).returning({ id: bookmarks.id });
          created += 1;
          existingNoteByKey.set(noteKey, note.id);
          createdBookmarkEvents.push({ id: note.id, groupId });
        }
        continue;
      }

      const existingKey = `${item.url}::${groupId ?? "null"}`;
      const existingId = existingByKey.get(existingKey);
      if (existingId) {
        await tx.update(bookmarks).set({ groupId, title: item.title, description: item.description, faviconUrl: item.faviconUrl, previewImageUrl: item.previewImageUrl, ...touchBookmark() }).where(eq(bookmarks.id, existingId));
        updated += 1;
        updatedBookmarkEvents.push({ id: existingId, groupId });
        continue;
      }
      const timestamp = item.createdAt ?? new Date();
      const [bookmark] = await tx.insert(bookmarks).values({
        userId, groupId, url: item.url, title: item.title, description: item.description,
        faviconUrl: item.faviconUrl, previewImageUrl: item.previewImageUrl,
        createdAt: timestamp,
        updatedAt: timestamp,
      }).returning({ id: bookmarks.id });
      created += 1;
      existingByKey.set(existingKey, bookmark.id);
      createdBookmarkEvents.push({ id: bookmark.id, groupId });
    }
  });

  for (const id of createdGroupIds) {
    publishUserEvent(userId, { type: "group.created", entity: "group", id });
  }
  for (const event of updatedBookmarkEvents) {
    publishBookmarkEvent(userId, "bookmark.updated", event.id, { groupId: event.groupId });
  }
  for (const event of createdBookmarkEvents) {
    publishBookmarkEvent(userId, "bookmark.created", event.id, { groupId: event.groupId });
  }
  revalidateBookmarkData();
  return { ok: true, created, updated, invalidCount };
}

async function getBookmarksUncached(
  userId: string,
  options?: {
    groupId?: string | null;
    search?: string;
    sort?: "createdAt" | "title";
    order?: "asc" | "desc";
  }
): Promise<BookmarkWithGroup[]> {
  const conditions = [eq(bookmarks.userId, userId)];
  if (options?.groupId !== undefined && options.groupId !== null) {
    conditions.push(eq(bookmarks.groupId, options.groupId));
  }
  if (options?.search?.trim()) {
    const q = `%${options.search.trim()}%`;
    conditions.push(
      or(
        ilike(bookmarks.title, q),
        ilike(bookmarks.url, q),
        ilike(bookmarks.description, q),
        // group name search via join handled below
      )!
    );
  }

  const sortCol = options?.sort === "title" ? bookmarks.title : bookmarks.createdAt;
  const orderDir = options?.order === "asc" ? asc(sortCol) : desc(sortCol);

  const whereClause = options?.search?.trim()
    ? and(
        eq(bookmarks.userId, userId),
        options?.groupId !== undefined && options.groupId !== null ? eq(bookmarks.groupId, options.groupId) : undefined,
        or(
          ilike(bookmarks.title, `%${options.search.trim()}%`),
          ilike(bookmarks.url, `%${options.search.trim()}%`),
          ilike(bookmarks.description, `%${options.search.trim()}%`),
          ilike(groups.name, `%${options.search.trim()}%`),
        ),
      )
    : and(
        eq(bookmarks.userId, userId),
        options?.groupId !== undefined && options.groupId !== null ? eq(bookmarks.groupId, options.groupId) : undefined,
      );

  const rows = await db
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
      group: {
        id: groups.id,
        name: groups.name,
        color: groups.color,
      },
    })
    .from(bookmarks)
    .leftJoin(groups, eq(bookmarks.groupId, groups.id))
    .where(whereClause)
    .orderBy(orderDir);

  return rows.map((r) => ({
    ...r,
    group: r.group?.id ? { id: r.group.id, name: r.group.name!, color: r.group.color ?? null } : null,
  })) as BookmarkWithGroup[];
}

export async function getBookmarks(options?: {
  groupId?: string | null;
  search?: string;
  sort?: "createdAt" | "title";
  order?: "asc" | "desc";
}): Promise<BookmarkWithGroup[]> {
  const userId = await currentUserId();
  const hasSearch = options?.search?.trim();
  if (hasSearch) return getBookmarksUncached(userId, options);
  const groupId = options?.groupId ?? "all";
  const sort = options?.sort ?? "createdAt";
  const order = options?.order ?? "desc";
  return unstable_cache(
    () => getBookmarksUncached(userId, options),
    ["bookmarks", userId, groupId, sort, order],
    { revalidate: 10, tags: ["bookmarks"] }
  )();
}

export async function getTotalBookmarkCount(): Promise<number> {
  const userId = await currentUserId();
  return unstable_cache(
    async () => {
      const [{ value }] = await db.select({ value: count() }).from(bookmarks).where(eq(bookmarks.userId, userId));
      return value;
    },
    ["bookmark-count", userId],
    { revalidate: 10, tags: ["bookmark-count"] }
  )();
}

async function findBookmarkWithGroup(id: string, userId: string): Promise<BookmarkWithGroup | null> {
  const [row] = await db
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
    .where(and(eq(bookmarks.id, id), eq(bookmarks.userId, userId)))
    .limit(1);
  if (!row) return null;
  return {
    ...row,
    group: row.group?.id ? { id: row.group.id, name: row.group.name!, color: row.group.color ?? null } : null,
  } as BookmarkWithGroup;
}

export async function createBookmark(
  url: string,
  options?: { groupId?: string | null; title?: string; description?: string }
) {
  const userId = await currentUserId();
  const normalized = url.trim();
  if (!normalized.startsWith("http")) throw new Error("Invalid URL");
  const groupId = await resolveGroupIdForUser(userId, options?.groupId);
  await consumeApiQuotaOrThrow(userId);
  const unfurled = await unfurlUrl(normalized);
  const data = {
    title: options?.title ?? unfurled.title ?? null,
    description: options?.description ?? unfurled.description ?? null,
    faviconUrl: unfurled.faviconUrl ?? null,
    previewImageUrl: unfurled.previewImageUrl ?? null,
  };

  const [existingRow] = await db
    .select({ id: bookmarks.id })
    .from(bookmarks)
    .where(and(
      eq(bookmarks.userId, userId),
      eq(bookmarks.url, normalized),
      groupId ? eq(bookmarks.groupId, groupId) : isNull(bookmarks.groupId),
    ))
    .limit(1);

  if (existingRow) {
    await db.update(bookmarks).set({ ...data, ...touchBookmark() }).where(eq(bookmarks.id, existingRow.id));
    const updated = await findBookmarkWithGroup(existingRow.id, userId);
    revalidateBookmarkData();
    publishBookmarkEvent(userId, "bookmark.updated", existingRow.id, { groupId: updated?.groupId ?? null });
    return updated as BookmarkWithGroup;
  }

  const [bookmark] = await db
    .insert(bookmarks)
    .values({ userId, groupId, url: normalized, ...data, ...touchBookmark() })
    .returning();
  const withGroup = await findBookmarkWithGroup(bookmark.id, userId);
  revalidateBookmarkData();
  publishBookmarkEvent(userId, "bookmark.created", bookmark.id, { groupId: bookmark.groupId });

  if (!bookmark.groupId) {
    categorizeBookmark(bookmark.id, userId).catch(() => {});
  }

  return withGroup as BookmarkWithGroup;
}

export async function createBookmarkFromMetadataForUser(
  userId: string,
  url: string,
  metadata: {
    title?: string | null;
    description?: string | null;
    faviconUrl?: string | null;
    previewImageUrl?: string | null;
  },
  groupId?: string | null
) {
  const normalized = url.trim();
  if (!normalized.startsWith("http")) throw new Error("Invalid URL");
  const gid = await resolveGroupIdForUser(userId, groupId);
  await consumeApiQuotaOrThrow(userId);
  const [existingRow] = await db
    .select({ id: bookmarks.id })
    .from(bookmarks)
    .where(and(
      eq(bookmarks.userId, userId),
      eq(bookmarks.url, normalized),
      gid ? eq(bookmarks.groupId, gid) : isNull(bookmarks.groupId),
    ))
    .limit(1);
  const data = {
    title: metadata.title ?? null,
    description: metadata.description ?? null,
    faviconUrl: metadata.faviconUrl ?? null,
    previewImageUrl: metadata.previewImageUrl ?? null,
  };
  if (existingRow) {
    await db.update(bookmarks).set({ ...data, ...touchBookmark() }).where(eq(bookmarks.id, existingRow.id));
    const updated = await findBookmarkWithGroup(existingRow.id, userId);
    revalidateBookmarkData();
    publishBookmarkEvent(userId, "bookmark.updated", existingRow.id, { groupId: updated?.groupId ?? null });
    return updated as BookmarkWithGroup;
  }
  const [bookmark] = await db
    .insert(bookmarks)
    .values({ userId, groupId: gid, url: normalized, ...data, ...touchBookmark() })
    .returning();
  const withGroup = await findBookmarkWithGroup(bookmark.id, userId);
  revalidateBookmarkData();
  publishBookmarkEvent(userId, "bookmark.created", bookmark.id, { groupId: bookmark.groupId });

  if (!bookmark.groupId) {
    categorizeBookmark(bookmark.id, userId).catch(() => {});
  }

  return withGroup as BookmarkWithGroup;
}

export async function createBookmarkFromMetadata(
  url: string,
  metadata: {
    title?: string | null;
    description?: string | null;
    faviconUrl?: string | null;
    previewImageUrl?: string | null;
  },
  groupId?: string | null
) {
  const userId = await currentUserId();
  return createBookmarkFromMetadataForUser(userId, url, metadata, groupId);
}

export async function createNote(content: string, groupId?: string | null) {
  const userId = await currentUserId();
  const trimmed = content.trim();
  if (!trimmed) throw new Error("Empty note");
  const resolvedGroupId = await resolveGroupIdForUser(userId, groupId);
  await consumeApiQuotaOrThrow(userId);
  const lines = trimmed.split(/\r?\n/);
  const title = lines[0]?.slice(0, 500) ?? "Note";
  const [bookmark] = await db
    .insert(bookmarks)
    .values({ userId, groupId: resolvedGroupId, url: null, title, description: trimmed, faviconUrl: null, previewImageUrl: null, ...touchBookmark() })
    .returning();
  const withGroup = await findBookmarkWithGroup(bookmark.id, userId);
  revalidateBookmarkData();
  publishBookmarkEvent(userId, "bookmark.created", bookmark.id, { groupId: bookmark.groupId });

  if (!bookmark.groupId) {
    categorizeBookmark(bookmark.id, userId).catch(() => {});
  }

  return withGroup as BookmarkWithGroup;
}

export async function updateBookmark(
  id: string,
  data: {
    title?: string | null;
    description?: string | null;
    url?: string | null;
    groupId?: string | null;
  }
) {
  const userId = await currentUserId();
  await consumeApiQuotaOrThrow(userId);
  const updateData: Partial<typeof bookmarks.$inferInsert> = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.url !== undefined) updateData.url = data.url === null || data.url === "" ? null : data.url.trim();
  if (data.groupId !== undefined) updateData.groupId = await resolveGroupIdForUser(userId, data.groupId);
  await db.update(bookmarks).set({ ...updateData, ...touchBookmark() }).where(and(eq(bookmarks.id, id), eq(bookmarks.userId, userId)));
  revalidateBookmarkData();
  publishBookmarkEvent(userId, "bookmark.updated", id, { groupId: data.groupId ?? null });
  return { ok: true };
}

export async function deleteBookmark(id: string) {
  const userId = await currentUserId();
  await consumeApiQuotaOrThrow(userId);
  await db.delete(bookmarks).where(and(eq(bookmarks.id, id), eq(bookmarks.userId, userId)));
  revalidateBookmarkData();
  publishBookmarkEvent(userId, "bookmark.deleted", id);
  return { ok: true };
}

export async function updateBookmarkCategoryForUser(
  userId: string,
  bookmarkId: string,
  categoryId: string | null
) {
  await consumeApiQuotaOrThrow(userId);
  const groupId = categoryId === "" ? null : categoryId;
  const resolvedGroupId = await resolveGroupIdForUser(userId, groupId);
  const [updatedRow] = await db.update(bookmarks).set({ groupId: resolvedGroupId, ...touchBookmark() }).where(and(eq(bookmarks.id, bookmarkId), eq(bookmarks.userId, userId))).returning({ id: bookmarks.id });
  if (!updatedRow) return null;
  revalidateBookmarkData();
  const updated = await findBookmarkWithGroup(bookmarkId, userId);
  publishBookmarkEvent(userId, "bookmark.category.updated", bookmarkId, { groupId: resolvedGroupId });
  return updated;
}

export async function refreshBookmark(id: string): Promise<BookmarkWithGroup | null> {
  const userId = await currentUserId();
  const result = await refreshBookmarkForUser(userId, id);
  if (!result.ok) return null;
  return result.bookmark;
}

export async function refreshBookmarkForUser(
  userId: string,
  id: string
): Promise<RefreshBookmarkForUserResult> {
  const bookmark = await findBookmarkWithGroup(id, userId);
  if (!bookmark) return { ok: false, reason: "not_found" };
  const normalizedUrl = bookmark.url?.trim();
  if (!normalizedUrl) return { ok: false, reason: "missing_url" };
  await consumeApiQuotaOrThrow(userId);
  const unfurled = await unfurlUrl(normalizedUrl);
  await db.update(bookmarks).set({
    title: unfurled.title ?? bookmark.title,
    description: unfurled.description ?? bookmark.description,
    faviconUrl: unfurled.faviconUrl ?? bookmark.faviconUrl,
    previewImageUrl: unfurled.previewImageUrl ?? bookmark.previewImageUrl,
    ...touchBookmark(),
  }).where(eq(bookmarks.id, id));
  revalidateBookmarkData();
  publishBookmarkEvent(userId, "bookmark.updated", id, { groupId: bookmark.groupId ?? null });
  const updated = await findBookmarkWithGroup(id, userId);
  if (!updated) return { ok: false, reason: "not_found" };
  return { ok: true, bookmark: updated };
}
