import { revalidatePath, revalidateTag } from "next/cache";
import { eq, and } from "drizzle-orm";
import { db, bookmarks, groups } from "@/lib/db";
import { publishUserEvent, type RealtimeEventType } from "@/lib/realtime";
import type { BookmarkWithGroup } from "./types";

/**
 * Internal helpers shared across the bookmark server actions
 * (queries / mutations / import). This module is server-only by virtue of being
 * imported exclusively from `"use server"` files — it is never bundled into the
 * client, so it deliberately omits the `"use server"` directive (its exports are
 * plain helpers, not server actions).
 */

/** Hard cap on a single bulk-import payload. */
export const MAX_IMPORT_ITEMS = 5000;

/** Invalidate every cache surface that can show bookmark/group data. */
export function revalidateBookmarkData() {
  revalidatePath("/");
  revalidatePath("/timeline");
  revalidateTag("bookmarks", "max");
  revalidateTag("bookmark-count", "max");
  revalidateTag("groups", "max");
  revalidateTag("admin-stats", "max");
}

export function publishBookmarkEvent(
  userId: string,
  type: RealtimeEventType,
  id: string,
  data?: Record<string, unknown>
) {
  publishUserEvent(userId, { type, entity: "bookmark", id, data });
}

/** Common `updatedAt` bump applied to every write. */
export function touchBookmark() {
  return { updatedAt: new Date() };
}

/** Resolve a group id to one owned by the user, throwing if it isn't theirs. */
export async function resolveGroupIdForUser(userId: string, groupId: string | null | undefined) {
  if (!groupId) return null;
  const [group] = await db
    .select({ id: groups.id })
    .from(groups)
    .where(and(eq(groups.id, groupId), eq(groups.userId, userId)))
    .limit(1);
  if (!group) throw new Error("Group not found");
  return group.id;
}

/** Fetch a single bookmark (scoped to the user) with its joined group. */
export async function findBookmarkWithGroup(id: string, userId: string): Promise<BookmarkWithGroup | null> {
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
