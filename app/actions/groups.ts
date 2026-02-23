"use server";

import { prisma } from "@/lib/prisma";
import { currentUserId } from "@/lib/auth";
import type { Group } from "@/app/generated/prisma/client";

export async function getGroups(): Promise<
  (Group & { _count: { bookmarks: number } })[]
> {
  const userId = await currentUserId();
  const list = await prisma.group.findMany({
    where: { userId },
    orderBy: { order: "asc" },
    include: { _count: { select: { bookmarks: true } } },
  });
  return list as (Group & { _count: { bookmarks: number } })[];
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
  return { ok: true };
}

export async function deleteGroup(id: string) {
  const userId = await currentUserId();
  await prisma.bookmark.updateMany({
    where: { groupId: id, userId },
    data: { groupId: null },
  });
  await prisma.group.deleteMany({ where: { id, userId } });
  return { ok: true };
}
