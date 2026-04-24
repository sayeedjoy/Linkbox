import type { groups } from "@/db/schema";

export type Group = typeof groups.$inferSelect;
export type GroupWithCount = Group & { _count: { bookmarks: number } };
