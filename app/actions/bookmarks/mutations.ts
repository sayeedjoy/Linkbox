"use server";

import { eq, and, isNull } from "drizzle-orm";
import { db, bookmarks } from "@/lib/db";
import { currentUserId } from "@/lib/auth";
import { unfurlUrl } from "@/app/actions/parse";
import { categorizeBookmark } from "@/app/actions/categorize";
import { consumeBookmarkQuotaOrThrow } from "@/lib/api-quota";
import type { BookmarkWithGroup, RefreshBookmarkForUserResult } from "./types";
import {
  revalidateBookmarkData,
  publishBookmarkEvent,
  touchBookmark,
  resolveGroupIdForUser,
  findBookmarkWithGroup,
} from "./shared";

export async function createBookmark(
  url: string,
  options?: { groupId?: string | null; title?: string; description?: string }
) {
  const userId = await currentUserId();
  const normalized = url.trim();
  if (!normalized.startsWith("http")) throw new Error("Invalid URL");
  const groupId = await resolveGroupIdForUser(userId, options?.groupId);
  await consumeBookmarkQuotaOrThrow(userId, 1);
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
  groupId?: string | null,
  source?: string | null
) {
  const normalized = url.trim();
  if (!normalized.startsWith("http")) throw new Error("Invalid URL");
  let gid: string | null = null;
  if (groupId) {
    gid = await resolveGroupIdForUser(userId, groupId);
  }
  // Realtime browser sync (`browser_realtime`) is intentionally NOT routed to the
  // "Imported - Browser" group — only bulk manual imports land there. Live-synced
  // bookmarks flow through the normal path and get auto-categorized below.
  // Quota intentionally NOT consumed here: callers (API route via guard, or the
  // public `createBookmarkFromMetadata` server action) are responsible for charging.
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
    .values({
      userId,
      groupId: gid,
      url: normalized,
      ...data,
      ...(source ? { source } : {}),
      ...touchBookmark(),
    })
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
  groupId?: string | null,
  source?: string | null
) {
  const userId = await currentUserId();
  await consumeBookmarkQuotaOrThrow(userId, 1);
  return createBookmarkFromMetadataForUser(userId, url, metadata, groupId, source);
}

export async function createNote(content: string, groupId?: string | null) {
  const userId = await currentUserId();
  const trimmed = content.trim();
  if (!trimmed) throw new Error("Empty note");
  const resolvedGroupId = await resolveGroupIdForUser(userId, groupId);
  await consumeBookmarkQuotaOrThrow(userId, 1);
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
  await consumeBookmarkQuotaOrThrow(userId, 1);
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
  await consumeBookmarkQuotaOrThrow(userId, 1);
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
  await consumeBookmarkQuotaOrThrow(userId, 1);
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
  await consumeBookmarkQuotaOrThrow(userId, 1);
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
