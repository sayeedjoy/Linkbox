"use server";

import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { currentUserId } from "@/lib/auth";
import { unfurlUrl } from "@/app/actions/parse";
import type { Bookmark } from "@/app/generated/prisma/client";
import { publishUserEvent, type RealtimeEventType } from "@/lib/realtime";
import { categorizeBookmark } from "@/app/actions/categorize";

export type BookmarkWithGroup = Bookmark & {
  group: { id: string; name: string; color: string | null } | null;
};

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
  publishUserEvent(userId, {
    type,
    entity: "bookmark",
    id,
    data,
  });
}

function normalizeImportBookmarkItem(item: ImportBookmarkItem) {
  const url = typeof item.url === "string" ? item.url.trim() : "";
  const title = typeof item.title === "string" ? item.title : null;
  const description = typeof item.description === "string" ? item.description : null;
  const faviconUrl = typeof item.faviconUrl === "string" ? item.faviconUrl : null;
  const previewImageUrl =
    typeof item.previewImageUrl === "string" ? item.previewImageUrl : null;
  const groupName = typeof item.group === "string" ? item.group.trim() : "";
  const groupColor = typeof item.groupColor === "string" ? item.groupColor : null;
  const isNote = !url && !!description;
  let createdAt: Date | null = null;
  if (typeof item.createdAt === "string") {
    const parsed = new Date(item.createdAt);
    if (!isNaN(parsed.getTime())) createdAt = parsed;
  }
  return {
    url,
    title,
    description,
    faviconUrl,
    previewImageUrl,
    groupName: groupName || null,
    groupColor,
    isNote,
    createdAt,
  };
}

export async function previewImportBookmarks(items: ImportBookmarkItem[]) {
  const userId = await currentUserId();
  if (!Array.isArray(items)) {
    return { total: 0, duplicateCount: 0, invalidCount: 0 };
  }
  if (items.length > MAX_IMPORT_ITEMS) {
    return {
      total: items.length,
      duplicateCount: 0,
      invalidCount: 0,
      error: `Import exceeds maximum of ${MAX_IMPORT_ITEMS} items`,
    };
  }

  const groups = await prisma.group.findMany({
    where: { userId },
    select: { id: true, name: true },
  });
  const groupByName = new Map<string, string>();
  for (const group of groups) groupByName.set(group.name.trim().toLowerCase(), group.id);

  const normalizedItems = items.map(normalizeImportBookmarkItem);

  // Identify groups that would be created during import (same logic as importBookmarks)
  const pendingGroupNames = new Set<string>();
  for (const item of normalizedItems) {
    if (!item.groupName) continue;
    const key = item.groupName.toLowerCase();
    if (!groupByName.has(key)) pendingGroupNames.add(key);
  }

  // Batch-fetch existing bookmarks for all valid URLs
  const validUrls = Array.from(
    new Set(
      normalizedItems
        .filter((item) => item.url && item.url.startsWith("http"))
        .map((item) => item.url)
    )
  );
  const existingBookmarks = validUrls.length
    ? await prisma.bookmark.findMany({
        where: { userId, url: { in: validUrls } },
        select: { id: true, url: true, groupId: true },
      })
    : [];
  const existingByKey = new Map<string, string>();
  for (const bookmark of existingBookmarks) {
    existingByKey.set(`${bookmark.url}::${bookmark.groupId ?? "null"}`, bookmark.id);
  }

  // Also fetch existing notes for note-based dedup
  const existingNotes = await prisma.bookmark.findMany({
    where: { userId, url: null },
    select: { id: true, title: true, groupId: true },
  });
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
    if (!isValidUrl && !item.isNote) {
      invalidCount += 1;
      continue;
    }

    // Resolve groupId: for pending (new) groups, use a synthetic placeholder
    // since they don't exist in DB, no bookmark can match them
    let groupId: string | null = null;
    if (item.groupName) {
      const key = item.groupName.toLowerCase();
      if (groupByName.has(key)) {
        groupId = groupByName.get(key)!;
      } else if (pendingGroupNames.has(key)) {
        // Group would be created during import -- no existing bookmarks can match
        groupId = `__pending__${key}`;
      }
    }

    let dedupKey: string;
    if (item.isNote) {
      const noteTitle = item.description?.split(/\r?\n/)[0]?.slice(0, 500) ?? "Note";
      dedupKey = `note::${noteTitle}::${groupId ?? "null"}`;
      // Check DB for existing note match (only if group already exists)
      if (!groupId?.startsWith("__pending__")) {
        const noteKey = `${noteTitle}::${groupId ?? "null"}`;
        if (existingNoteByKey.has(noteKey)) {
          if (!seenKeys.has(dedupKey)) {
            duplicateCount += 1;
          }
        }
      }
    } else {
      dedupKey = `${item.url}::${groupId ?? "null"}`;
      // Check DB for existing bookmark match (only if group already exists)
      if (!groupId?.startsWith("__pending__") && existingByKey.has(dedupKey)) {
        if (!seenKeys.has(dedupKey)) {
          duplicateCount += 1;
        }
      }
    }

    // Track intra-file duplicates: subsequent items with the same key
    // will overwrite during import, so they are effectively extra duplicates
    if (seenKeys.has(dedupKey)) {
      duplicateCount += 1;
    }
    seenKeys.add(dedupKey);
  }

  return { total, duplicateCount, invalidCount };
}

export async function importBookmarks(items: ImportBookmarkItem[]) {
  const userId = await currentUserId();
  if (!Array.isArray(items)) {
    return { error: "Invalid import payload" };
  }
  if (items.length > MAX_IMPORT_ITEMS) {
    return { error: `Import exceeds maximum of ${MAX_IMPORT_ITEMS} items` };
  }

  const groups = await prisma.group.findMany({
    where: { userId },
    select: { id: true, name: true },
  });
  const groupByName = new Map<string, string>();
  for (const group of groups) groupByName.set(group.name.trim().toLowerCase(), group.id);

  const normalizedItems = items.map(normalizeImportBookmarkItem);
  const validUrls = Array.from(
    new Set(normalizedItems.filter((item) => item.url && item.url.startsWith("http")).map((item) => item.url))
  );
  const pendingGroupCreates = new Map<string, { name: string; color: string | null }>();
  for (const item of normalizedItems) {
    if (!item.groupName) continue;
    const key = item.groupName.toLowerCase();
    if (groupByName.has(key) || pendingGroupCreates.has(key)) continue;
    pendingGroupCreates.set(key, { name: item.groupName, color: item.groupColor });
  }
  const existingBookmarks = validUrls.length
    ? await prisma.bookmark.findMany({
        where: { userId, url: { in: validUrls } },
        select: { id: true, url: true, groupId: true },
      })
    : [];
  const existingByKey = new Map<string, string>();
  for (const bookmark of existingBookmarks) {
    existingByKey.set(`${bookmark.url}::${bookmark.groupId ?? "null"}`, bookmark.id);
  }

  // Fetch existing notes for note-based dedup
  const existingNotes = await prisma.bookmark.findMany({
    where: { userId, url: null },
    select: { id: true, title: true, groupId: true },
  });
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

  await prisma.$transaction(async (tx) => {
    let nextOrder =
      (await tx.group
        .aggregate({
          where: { userId },
          _max: { order: true },
        })
        .then((r) => r._max.order ?? -1)) + 1;

    for (const [key, groupData] of pendingGroupCreates.entries()) {
      const createdGroup = await tx.group.create({
        data: {
          userId,
          name: groupData.name,
          color: groupData.color,
          order: nextOrder,
        },
      });
      nextOrder += 1;
      groupByName.set(key, createdGroup.id);
      createdGroupIds.push(createdGroup.id);
    }

    for (const item of normalizedItems) {
      const isValidUrl = item.url && item.url.startsWith("http");
      if (!isValidUrl && !item.isNote) {
        invalidCount += 1;
        continue;
      }
      const groupId = item.groupName ? (groupByName.get(item.groupName.toLowerCase()) ?? null) : null;

      if (item.isNote) {
        // Note dedup: match by title (derived from first line of description) + groupId
        const noteTitle = item.description?.split(/\r?\n/)[0]?.slice(0, 500) ?? "Note";
        const noteKey = `${noteTitle}::${groupId ?? "null"}`;
        const existingNoteId = existingNoteByKey.get(noteKey);
        if (existingNoteId) {
          await tx.bookmark.update({
            where: { id: existingNoteId },
            data: {
              groupId,
              title: noteTitle,
              description: item.description,
            },
          });
          updated += 1;
          updatedBookmarkEvents.push({ id: existingNoteId, groupId });
        } else {
          const note = await tx.bookmark.create({
            data: {
              userId,
              groupId,
              url: null,
              title: noteTitle,
              description: item.description,
              faviconUrl: null,
              previewImageUrl: null,
              ...(item.createdAt ? { createdAt: item.createdAt } : {}),
            },
          });
          created += 1;
          existingNoteByKey.set(noteKey, note.id);
          createdBookmarkEvents.push({ id: note.id, groupId });
        }
        continue;
      }

      const existingKey = `${item.url}::${groupId ?? "null"}`;
      const existingId = existingByKey.get(existingKey);
      if (existingId) {
        await tx.bookmark.update({
          where: { id: existingId },
          data: {
            groupId,
            title: item.title,
            description: item.description,
            faviconUrl: item.faviconUrl,
            previewImageUrl: item.previewImageUrl,
          },
        });
        updated += 1;
        updatedBookmarkEvents.push({ id: existingId, groupId });
        continue;
      }
      const bookmark = await tx.bookmark.create({
        data: {
          userId,
          groupId,
          url: item.url,
          title: item.title,
          description: item.description,
          faviconUrl: item.faviconUrl,
          previewImageUrl: item.previewImageUrl,
          ...(item.createdAt ? { createdAt: item.createdAt } : {}),
        },
      });
      created += 1;
      existingByKey.set(existingKey, bookmark.id);
      createdBookmarkEvents.push({ id: bookmark.id, groupId });
    }
  }, { timeout: 30000 });

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
  const where: {
    userId: string;
    groupId?: string | null;
    OR?: Array<{
      title?: { contains: string; mode: "insensitive" };
      url?: { contains: string; mode: "insensitive" };
      description?: { contains: string; mode: "insensitive" };
      group?: { name: { contains: string; mode: "insensitive" } };
    }>;
  } = { userId };
  if (options?.groupId !== undefined && options.groupId !== null)
    where.groupId = options.groupId;
  if (options?.search?.trim()) {
    const q = options.search.trim();
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { url: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { group: { name: { contains: q, mode: "insensitive" } } },
    ];
  }
  const sortKey = options?.sort ?? "createdAt";
  const order = options?.order ?? "desc";
  const list = await prisma.bookmark.findMany({
    where,
    orderBy: { [sortKey]: order },
    include: {
      group: { select: { id: true, name: true, color: true } },
    },
  });
  return list as BookmarkWithGroup[];
}

export async function getBookmarks(options?: {
  groupId?: string | null;
  search?: string;
  sort?: "createdAt" | "title";
  order?: "asc" | "desc";
}): Promise<BookmarkWithGroup[]> {
  const userId = await currentUserId();
  const hasSearch = options?.search?.trim();
  if (hasSearch) {
    return getBookmarksUncached(userId, options);
  }
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
    () => prisma.bookmark.count({ where: { userId } }),
    ["bookmark-count", userId],
    { revalidate: 10, tags: ["bookmark-count"] }
  )();
}

export async function createBookmark(
  url: string,
  options?: { groupId?: string | null; title?: string; description?: string }
) {
  const userId = await currentUserId();
  const normalized = url.trim();
  if (!normalized.startsWith("http")) throw new Error("Invalid URL");
  const groupId = options?.groupId ?? null;
  const existing = await prisma.bookmark.findFirst({
    where: { userId, url: normalized, groupId },
    include: { group: { select: { id: true, name: true, color: true } } },
  });
  const unfurled = await unfurlUrl(normalized);
  const data = {
    title: options?.title ?? unfurled.title ?? null,
    description: options?.description ?? unfurled.description ?? null,
    faviconUrl: unfurled.faviconUrl ?? null,
    previewImageUrl: unfurled.previewImageUrl ?? null,
  };
  if (existing) {
    const updated = await prisma.bookmark.update({
      where: { id: existing.id },
      data,
      include: { group: { select: { id: true, name: true, color: true } } },
    });
    revalidateBookmarkData();
    publishBookmarkEvent(userId, "bookmark.updated", updated.id, { groupId: updated.groupId });
    return updated as BookmarkWithGroup;
  }
  const bookmark = await prisma.bookmark.create({
    data: {
      userId,
      groupId,
      url: normalized,
      ...data,
    },
    include: {
      group: { select: { id: true, name: true, color: true } },
    },
  });
  revalidateBookmarkData();
  publishBookmarkEvent(userId, "bookmark.created", bookmark.id, { groupId: bookmark.groupId });

  // Fire-and-forget auto-categorization for uncategorized bookmarks
  if (!bookmark.groupId) {
    categorizeBookmark(bookmark.id, userId).catch(() => {});
  }

  return bookmark as BookmarkWithGroup;
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
  const gid = groupId ?? null;
  const existing = await prisma.bookmark.findFirst({
    where: { userId, url: normalized, groupId: gid },
    include: { group: { select: { id: true, name: true, color: true } } },
  });
  const data = {
    title: metadata.title ?? null,
    description: metadata.description ?? null,
    faviconUrl: metadata.faviconUrl ?? null,
    previewImageUrl: metadata.previewImageUrl ?? null,
  };
  if (existing) {
    const updated = await prisma.bookmark.update({
      where: { id: existing.id },
      data,
      include: { group: { select: { id: true, name: true, color: true } } },
    });
    revalidateBookmarkData();
    publishBookmarkEvent(userId, "bookmark.updated", updated.id, { groupId: updated.groupId });
    return updated as BookmarkWithGroup;
  }
  const bookmark = await prisma.bookmark.create({
    data: {
      userId,
      groupId: gid,
      url: normalized,
      ...data,
    },
    include: {
      group: { select: { id: true, name: true, color: true } },
    },
  });
  revalidateBookmarkData();
  publishBookmarkEvent(userId, "bookmark.created", bookmark.id, { groupId: bookmark.groupId });

  // Fire-and-forget auto-categorization for uncategorized bookmarks
  if (!bookmark.groupId) {
    categorizeBookmark(bookmark.id, userId).catch(() => {});
  }

  return bookmark as BookmarkWithGroup;
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
  const out = await createBookmarkFromMetadataForUser(userId, url, metadata, groupId);
  return out;
}

export async function createNote(content: string, groupId?: string | null) {
  const userId = await currentUserId();
  const trimmed = content.trim();
  if (!trimmed) throw new Error("Empty note");
  const lines = trimmed.split(/\r?\n/);
  const title = lines[0]?.slice(0, 500) ?? "Note";
  const bookmark = await prisma.bookmark.create({
    data: {
      userId,
      groupId: groupId ?? null,
      url: null,
      title,
      description: trimmed,
      faviconUrl: null,
      previewImageUrl: null,
    },
    include: {
      group: { select: { id: true, name: true, color: true } },
    },
  });
  revalidateBookmarkData();
  publishBookmarkEvent(userId, "bookmark.created", bookmark.id, { groupId: bookmark.groupId });

  // Fire-and-forget auto-categorization for uncategorized notes
  if (!bookmark.groupId) {
    categorizeBookmark(bookmark.id, userId).catch(() => {});
  }

  return bookmark as BookmarkWithGroup;
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
  const updateData: Record<string, unknown> = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.url !== undefined) updateData.url = data.url === null || data.url === "" ? null : data.url.trim();
  if (data.groupId !== undefined) updateData.groupId = data.groupId;
  await prisma.bookmark.updateMany({
    where: { id, userId },
    data: updateData,
  });
  revalidateBookmarkData();
  publishBookmarkEvent(userId, "bookmark.updated", id, { groupId: data.groupId ?? null });
  return { ok: true };
}

export async function deleteBookmark(id: string) {
  const userId = await currentUserId();
  await prisma.bookmark.deleteMany({ where: { id, userId } });
  revalidateBookmarkData();
  publishBookmarkEvent(userId, "bookmark.deleted", id);
  return { ok: true };
}

export async function updateBookmarkCategoryForUser(
  userId: string,
  bookmarkId: string,
  categoryId: string | null
) {
  const groupId = categoryId === "" ? null : categoryId;
  await prisma.bookmark.updateMany({
    where: { id: bookmarkId, userId },
    data: { groupId },
  });
  revalidateBookmarkData();
  const updated = await prisma.bookmark.findFirst({
    where: { id: bookmarkId, userId },
    include: { group: { select: { id: true, name: true, color: true } } },
  });
  publishBookmarkEvent(userId, "bookmark.category.updated", bookmarkId, { groupId: groupId ?? null });
  return updated;
}

export async function refreshBookmark(id: string): Promise<BookmarkWithGroup | null> {
  const userId = await currentUserId();
  const bookmark = await prisma.bookmark.findFirst({
    where: { id, userId },
    include: { group: { select: { id: true, name: true, color: true } } },
  });
  if (!bookmark?.url?.trim()) return null;
  const unfurled = await unfurlUrl(bookmark.url.trim());
  await prisma.bookmark.update({
    where: { id },
    data: {
      title: unfurled.title ?? bookmark.title,
      description: unfurled.description ?? bookmark.description,
      faviconUrl: unfurled.faviconUrl ?? bookmark.faviconUrl,
      previewImageUrl: unfurled.previewImageUrl ?? bookmark.previewImageUrl,
    },
  });
  revalidateBookmarkData();
  publishBookmarkEvent(userId, "bookmark.updated", id, { groupId: bookmark.groupId ?? null });
  const updated = await prisma.bookmark.findUnique({
    where: { id },
    include: { group: { select: { id: true, name: true, color: true } } },
  });
  return updated as BookmarkWithGroup;
}
