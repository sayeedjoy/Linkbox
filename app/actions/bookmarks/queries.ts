"use server";

import { unstable_cache } from "next/cache";
import { eq, and, or, ilike, asc, desc, count } from "drizzle-orm";
import { db, bookmarks, groups } from "@/lib/db";
import { currentUserId } from "@/lib/auth";
import type { BookmarkWithGroup } from "./types";

type GetBookmarksOptions = {
  groupId?: string | null;
  search?: string;
  sort?: "createdAt" | "title";
  order?: "asc" | "desc";
};

async function getBookmarksUncached(
  userId: string,
  options?: GetBookmarksOptions
): Promise<BookmarkWithGroup[]> {
  const sortCol = options?.sort === "title" ? bookmarks.title : bookmarks.createdAt;
  const orderDir = options?.order === "asc" ? asc(sortCol) : desc(sortCol);

  const groupFilter =
    options?.groupId !== undefined && options.groupId !== null
      ? eq(bookmarks.groupId, options.groupId)
      : undefined;

  const search = options?.search?.trim();
  const whereClause = search
    ? and(
        eq(bookmarks.userId, userId),
        groupFilter,
        or(
          ilike(bookmarks.title, `%${search}%`),
          ilike(bookmarks.url, `%${search}%`),
          ilike(bookmarks.description, `%${search}%`),
          ilike(groups.name, `%${search}%`),
        ),
      )
    : and(eq(bookmarks.userId, userId), groupFilter);

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

export async function getBookmarks(options?: GetBookmarksOptions): Promise<BookmarkWithGroup[]> {
  const userId = await currentUserId();
  // Searches are not cached: too many distinct keys to be worth it.
  if (options?.search?.trim()) return getBookmarksUncached(userId, options);
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
