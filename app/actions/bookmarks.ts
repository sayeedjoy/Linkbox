"use server";

import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { currentUserId } from "@/lib/auth";
import { unfurlUrl } from "@/app/actions/parse";
import type { Bookmark } from "@/app/generated/prisma/client";

export type BookmarkWithGroup = Bookmark & {
  group: { id: string; name: string; color: string | null } | null;
};

function revalidateBookmarkData() {
  revalidatePath("/");
  revalidatePath("/timeline");
  revalidateTag("bookmarks", "max");
  revalidateTag("bookmark-count", "max");
  revalidateTag("groups", "max");
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
  return { ok: true };
}

export async function deleteBookmark(id: string) {
  const userId = await currentUserId();
  await prisma.bookmark.deleteMany({ where: { id, userId } });
  revalidateBookmarkData();
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
  const updated = await prisma.bookmark.findUnique({
    where: { id },
    include: { group: { select: { id: true, name: true, color: true } } },
  });
  return updated as BookmarkWithGroup;
}
