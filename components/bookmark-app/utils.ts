import type { BookmarkWithGroup } from "@/app/actions/bookmarks";
import type { GroupWithCount } from "@/lib/types";

export function hostnameFromUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export function filterBookmarks(list: BookmarkWithGroup[], q: string): BookmarkWithGroup[] {
  const lower = q.trim().toLowerCase();
  if (!lower) return list;
  return list.filter((b) => {
    const title = (b.title ?? "").toLowerCase();
    const url = (b.url ?? "").toLowerCase();
    const desc = (b.description ?? "").toLowerCase();
    const group = (b.group?.name ?? "").toLowerCase();
    return title.includes(lower) || url.includes(lower) || desc.includes(lower) || group.includes(lower);
  });
}

export function makeOptimisticBookmark(
  optId: string,
  payload: { url?: string | null; title?: string | null; groupId?: string | null },
  groups: GroupWithCount[]
): BookmarkWithGroup {
  const group = payload.groupId ? groups.find((g) => g.id === payload.groupId) ?? null : null;
  const now = new Date();
  const title =
    payload.title ??
    (payload.url ? hostnameFromUrl(payload.url) : null) ??
    "Loading…";
  return {
    id: optId,
    userId: "",
    groupId: payload.groupId ?? null,
    url: payload.url ?? null,
    title,
    description: null,
    faviconUrl: null,
    previewImageUrl: null,
    createdAt: now,
    updatedAt: now,
    group: group ? { id: group.id, name: group.name, color: group.color } : null,
  };
}
