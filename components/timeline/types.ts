import type { BookmarkWithGroup } from "@/app/actions/bookmarks";

export interface Bookmark {
  id: string;
  title: string | null;
  description: string | null;
  url: string | null;
  favicon: string;
  category: string;
  groupId: string | null;
  createdAt: Date | string;
  isFavorite: boolean;
}

function getFaviconUrl(b: BookmarkWithGroup): string {
  if (b.faviconUrl?.trim()) return b.faviconUrl.trim();
  if (!b.url?.trim()) return "";
  try {
    const hostname = new URL(b.url).hostname;
    return `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(hostname)}`;
  } catch {
    return "";
  }
}

export function bookmarkWithGroupToTimeline(b: BookmarkWithGroup): Bookmark {
  return {
    id: b.id,
    title: b.title ?? null,
    description: b.description ?? null,
    url: b.url ?? null,
    favicon: getFaviconUrl(b),
    category: b.group?.name ?? "Uncategorized",
    groupId: b.groupId ?? null,
    createdAt: b.createdAt,
    isFavorite: false,
  };
}
