"use server";

import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
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
  revalidateTag("groups");
  return { ok: true };
}

export async function createGroupForUser(userId: string, name: string, color?: string | null) {
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
  revalidateTag("groups");
  return group;
}

export async function updateGroupForUser(
  userId: string,
  id: string,
  data: { name?: string; color?: string | null; order?: number }
) {
  const updatePayload: { name?: string; color?: string | null; order?: number } = {};
  if (data.name !== undefined) updatePayload.name = data.name.trim();
  if (data.color !== undefined) updatePayload.color = data.color;
  if (data.order !== undefined) updatePayload.order = data.order;
  if (Object.keys(updatePayload).length === 0) return { ok: true };
  await prisma.group.updateMany({
    where: { id, userId },
    data: updatePayload,
  });
  revalidatePath("/");
  revalidateTag("groups");
  return { ok: true };
}

export async function deleteGroupForUser(userId: string, id: string) {
  await prisma.bookmark.updateMany({
    where: { groupId: id, userId },
    data: { groupId: null },
  });
  await prisma.group.deleteMany({ where: { id, userId } });
  revalidatePath("/");
  revalidateTag("groups");
  return { ok: true };
}
