"use server";

import { prisma } from "@/lib/prisma";
import { currentUserId } from "@/lib/auth";
import { unfurlUrl } from "@/app/actions/parse";
import type { Bookmark } from "@/app/generated/prisma/client";

export type BookmarkWithGroup = Bookmark & {
  group: { id: string; name: string; color: string | null } | null;
};

export async function getBookmarks(options?: {
  groupId?: string | null;
  search?: string;
  sort?: "createdAt" | "title";
  order?: "asc" | "desc";
}): Promise<BookmarkWithGroup[]> {
  const userId = await currentUserId();
  const where: {
    userId: string;
    groupId?: string | null;
    OR?: Array<{
      title?: { contains: string; mode: "insensitive" };
      url?: { contains: string; mode: "insensitive" };
      description?: { contains: string; mode: "insensitive" };
    }>;
  } = { userId };
  if (options?.groupId !== undefined && options.groupId !== null)
    where.groupId = options.groupId;
  if (options?.search?.trim()) {
    const q = `%${options.search.trim()}%`;
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { url: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
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

export async function createBookmark(
  url: string,
  options?: { groupId?: string | null; title?: string; description?: string }
) {
  const userId = await currentUserId();
  const normalized = url.trim();
  if (!normalized.startsWith("http")) throw new Error("Invalid URL");
  const unfurled = await unfurlUrl(normalized);
  const bookmark = await prisma.bookmark.create({
    data: {
      userId,
      groupId: options?.groupId ?? null,
      url: normalized,
      title: options?.title ?? unfurled.title ?? null,
      description: options?.description ?? unfurled.description ?? null,
      faviconUrl: unfurled.faviconUrl ?? null,
      previewImageUrl: unfurled.previewImageUrl ?? null,
    },
    include: {
      group: { select: { id: true, name: true, color: true } },
    },
  });
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
  const normalized = url.trim();
  if (!normalized.startsWith("http")) throw new Error("Invalid URL");
  const bookmark = await prisma.bookmark.create({
    data: {
      userId,
      groupId: groupId ?? null,
      url: normalized,
      title: metadata.title ?? null,
      description: metadata.description ?? null,
      faviconUrl: metadata.faviconUrl ?? null,
      previewImageUrl: metadata.previewImageUrl ?? null,
    },
    include: {
      group: { select: { id: true, name: true, color: true } },
    },
  });
  return bookmark as BookmarkWithGroup;
}

export async function updateBookmark(
  id: string,
  data: {
    title?: string | null;
    description?: string | null;
    url?: string;
    groupId?: string | null;
  }
) {
  const userId = await currentUserId();
  const updateData: Record<string, unknown> = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.url !== undefined) updateData.url = data.url.trim();
  if (data.groupId !== undefined) updateData.groupId = data.groupId;
  await prisma.bookmark.updateMany({
    where: { id, userId },
    data: updateData,
  });
  return { ok: true };
}

export async function deleteBookmark(id: string) {
  const userId = await currentUserId();
  await prisma.bookmark.deleteMany({ where: { id, userId } });
  return { ok: true };
}
