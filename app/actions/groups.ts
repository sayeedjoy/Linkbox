"use server";

import { revalidatePath, unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { currentUserId } from "@/lib/auth";
import type { Group } from "@/app/generated/prisma/client";

export type GroupWithCount = Group & { _count: { bookmarks: number } };

export async function getGroupsForUser(userId: string): Promise<GroupWithCount[]> {
  const list = await prisma.group.findMany({
    where: { userId },
    orderBy: { order: "asc" },
    include: { _count: { select: { bookmarks: true } } },
  });
  return list as GroupWithCount[];
}

export async function getGroups(): Promise<GroupWithCount[]> {
  const userId = await currentUserId();
  return unstable_cache(
    () => getGroupsForUser(userId),
    ["groups", userId],
    { revalidate: 10, tags: ["groups"] }
  )();
}

export async function createGroup(name: string, color?: string) {
  const userId = await currentUserId();
  const maxOrder = await prisma.group
    .aggregate({
      where: { userId },
      _max: { order: true },
    })
    .then((r) => r._max.order ?? -1);
  const group = await prisma.group.create({
    data: {
      userId,
      name: name.trim(),
      color: color ?? null,
      order: maxOrder + 1,
    },
  });
  revalidatePath("/");
  return group;
}

export async function updateGroup(
  id: string,
  data: { name?: string; color?: string | null; order?: number }
) {
  const userId = await currentUserId();
  await prisma.group.updateMany({
    where: { id, userId },
    data,
  });
  revalidatePath("/");
  return { ok: true };
}

export async function reorderGroups(orderedIds: string[]) {
  const userId = await currentUserId();
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.group.updateMany({
        where: { id, userId },
        data: { order: index },
      })
    )
  );
  revalidatePath("/");
  return { ok: true };
}

export async function deleteGroup(id: string) {
  const userId = await currentUserId();
  await prisma.bookmark.updateMany({
    where: { groupId: id, userId },
    data: { groupId: null },
  });
  await prisma.group.deleteMany({ where: { id, userId } });
  revalidatePath("/");
  return { ok: true };
}
