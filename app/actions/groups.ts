"use server";

import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { eq, and, asc, count, sql } from "drizzle-orm";
import { db, groups, bookmarks } from "@/lib/db";
import { currentUserId } from "@/lib/auth";
import { publishUserEvent } from "@/lib/realtime";
import { consumeApiQuotaOrThrow } from "@/lib/api-quota";
import { getPlanFeaturesForUser, resolveGroupColorForPlan } from "@/lib/plan-entitlements";

export type GroupWithCount = {
  id: string;
  userId: string;
  name: string;
  color: string | null;
  order: number;
  _count: { bookmarks: number };
};

async function getMaxGroupOrder(userId: string): Promise<number> {
  const [row] = await db
    .select({ maxOrder: sql<number>`coalesce(max(${groups.order}), -1)` })
    .from(groups)
    .where(eq(groups.userId, userId));
  return row?.maxOrder ?? -1;
}

export async function getGroupsForUser(userId: string): Promise<GroupWithCount[]> {
  const rows = await db
    .select({
      id: groups.id,
      userId: groups.userId,
      name: groups.name,
      color: groups.color,
      order: groups.order,
      bookmarkCount: count(bookmarks.id),
    })
    .from(groups)
    .leftJoin(bookmarks, eq(bookmarks.groupId, groups.id))
    .where(eq(groups.userId, userId))
    .groupBy(groups.id)
    .orderBy(asc(groups.order));

  return rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    name: r.name,
    color: r.color,
    order: r.order,
    _count: { bookmarks: r.bookmarkCount },
  }));
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
  const trimmedName = name.trim();
  if (!trimmedName) throw new Error("Group name is required");
  const plan = await getPlanFeaturesForUser(userId);
  await consumeApiQuotaOrThrow(userId, plan);
  const resolvedColor = resolveGroupColorForPlan(plan.groupColoringAllowed, color ?? null);
  const maxOrder = await getMaxGroupOrder(userId);
  const [group] = await db
    .insert(groups)
    .values({ userId, name: trimmedName, color: resolvedColor, order: maxOrder + 1 })
    .returning();
  revalidatePath("/");
  revalidateTag("groups", "max");
  revalidateTag("admin-stats", "max");
  publishUserEvent(userId, { type: "group.created", entity: "group", id: group.id });
  return group;
}

export async function updateGroup(
  id: string,
  data: { name?: string; color?: string | null; order?: number }
) {
  const userId = await currentUserId();
  const updatePayload: { name?: string; color?: string | null; order?: number } = {};
  if (data.name !== undefined) {
    const trimmedName = data.name.trim();
    if (!trimmedName) throw new Error("Group name is required");
    updatePayload.name = trimmedName;
  }
  const needsPlanFeatures = data.color !== undefined;
  const plan = needsPlanFeatures ? await getPlanFeaturesForUser(userId) : null;
  if (data.color !== undefined) updatePayload.color = resolveGroupColorForPlan(plan!.groupColoringAllowed, data.color);
  if (data.order !== undefined) updatePayload.order = data.order;
  if (Object.keys(updatePayload).length === 0) return { ok: true };
  await consumeApiQuotaOrThrow(userId, plan ?? undefined);
  await db.update(groups).set(updatePayload).where(and(eq(groups.id, id), eq(groups.userId, userId)));
  revalidatePath("/");
  revalidateTag("groups", "max");
  publishUserEvent(userId, { type: "group.updated", entity: "group", id });
  return { ok: true };
}

export async function reorderGroups(orderedIds: string[]) {
  const userId = await currentUserId();
  await consumeApiQuotaOrThrow(userId);
  await db.transaction(async (tx) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await tx
        .update(groups)
        .set({ order: i })
        .where(and(eq(groups.id, orderedIds[i]!), eq(groups.userId, userId)));
    }
  });
  revalidatePath("/");
  revalidateTag("groups", "max");
  for (const id of orderedIds) {
    publishUserEvent(userId, { type: "group.updated", entity: "group", id });
  }
  return { ok: true };
}

export async function deleteGroup(id: string) {
  const userId = await currentUserId();
  await consumeApiQuotaOrThrow(userId);
  await db.update(bookmarks).set({ groupId: null, updatedAt: new Date() }).where(and(eq(bookmarks.groupId, id), eq(bookmarks.userId, userId)));
  await db.delete(groups).where(and(eq(groups.id, id), eq(groups.userId, userId)));
  revalidatePath("/");
  revalidateTag("groups", "max");
  revalidateTag("admin-stats", "max");
  publishUserEvent(userId, { type: "group.deleted", entity: "group", id });
  return { ok: true };
}

export async function createGroupForUser(userId: string, name: string, color?: string | null) {
  const trimmedName = name.trim();
  if (!trimmedName) throw new Error("Group name is required");
  const plan = await getPlanFeaturesForUser(userId);
  await consumeApiQuotaOrThrow(userId, plan);
  const resolvedColor = resolveGroupColorForPlan(plan.groupColoringAllowed, color ?? null);
  const maxOrder = await getMaxGroupOrder(userId);
  const [group] = await db
    .insert(groups)
    .values({ userId, name: trimmedName, color: resolvedColor, order: maxOrder + 1 })
    .returning();
  revalidatePath("/");
  revalidateTag("groups", "max");
  revalidateTag("admin-stats", "max");
  publishUserEvent(userId, { type: "group.created", entity: "group", id: group.id });
  return group;
}

export async function updateGroupForUser(
  userId: string,
  id: string,
  data: { name?: string; color?: string | null; order?: number }
) {
  const updatePayload: { name?: string; color?: string | null; order?: number } = {};
  if (data.name !== undefined) {
    const trimmedName = data.name.trim();
    if (!trimmedName) throw new Error("Group name is required");
    updatePayload.name = trimmedName;
  }
  const needsPlanFeatures = data.color !== undefined;
  const plan = needsPlanFeatures ? await getPlanFeaturesForUser(userId) : null;
  if (data.color !== undefined) updatePayload.color = resolveGroupColorForPlan(plan!.groupColoringAllowed, data.color);
  if (data.order !== undefined) updatePayload.order = data.order;
  if (Object.keys(updatePayload).length === 0) return { ok: true };
  await consumeApiQuotaOrThrow(userId, plan ?? undefined);
  await db.update(groups).set(updatePayload).where(and(eq(groups.id, id), eq(groups.userId, userId)));
  revalidatePath("/");
  revalidateTag("groups", "max");
  publishUserEvent(userId, { type: "group.updated", entity: "group", id });
  return { ok: true };
}

export async function deleteGroupForUser(userId: string, id: string) {
  await consumeApiQuotaOrThrow(userId);
  await db.update(bookmarks).set({ groupId: null, updatedAt: new Date() }).where(and(eq(bookmarks.groupId, id), eq(bookmarks.userId, userId)));
  await db.delete(groups).where(and(eq(groups.id, id), eq(groups.userId, userId)));
  revalidatePath("/");
  revalidateTag("groups", "max");
  revalidateTag("admin-stats", "max");
  publishUserEvent(userId, { type: "group.deleted", entity: "group", id });
  return { ok: true };
}
