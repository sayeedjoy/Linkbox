export function groupsKey(userId: string) {
  return ["groups", userId] as const;
}

export function bookmarksKey(
  userId: string,
  groupId: string | null,
  sort: "createdAt" | "title",
  order: "asc" | "desc"
) {
  return ["bookmarks", userId, groupId ?? "all", sort, order] as const;
}

export function bookmarkCountKey(userId: string) {
  return ["bookmark-count", userId] as const;
}

export function timelineBookmarksKey(
  userId: string
) {
  return ["bookmarks", userId, "timeline"] as const;
}
