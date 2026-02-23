import type { Group } from "@/app/generated/prisma/client";

export type GroupWithCount = Group & { _count: { bookmarks: number } };
