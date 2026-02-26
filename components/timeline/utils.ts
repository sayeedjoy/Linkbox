import type { Bookmark } from "./types";

function toDateOnly(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function getDateGroupLabel(date: Date): string {
  const d = toDateOnly(date);
  const today = toDateOnly(new Date());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.getTime() === today.getTime()) return "Today";
  if (d.getTime() === yesterday.getTime()) return "Yesterday";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

export function groupBookmarksByDate(
  bookmarks: Bookmark[]
): { label: string; items: Bookmark[] }[] {
  const map = new Map<string, Bookmark[]>();
  for (const b of bookmarks) {
    const label = getDateGroupLabel(new Date(b.createdAt));
    const list = map.get(label) ?? [];
    list.push(b);
    map.set(label, list);
  }
  return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
}

export function safeHostname(url: string | null): string {
  if (!url) return "";
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
