import { bookmarks } from "@/lib/db";

/** A bookmark row joined with its (optional) group. The canonical read shape. */
export type BookmarkWithGroup = typeof bookmarks.$inferSelect & {
  group: { id: string; name: string; color: string | null } | null;
};

export type RefreshBookmarkForUserResult =
  | { ok: true; bookmark: BookmarkWithGroup }
  | { ok: false; reason: "not_found" | "missing_url" };

/** Shape accepted by the bulk import / preview server actions. */
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
