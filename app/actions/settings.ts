"use server";

import { currentUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { backfillUngroupedBookmarks } from "@/app/actions/categorize";

/**
 * Get the current user's auto-group preference.
 */
export async function getAutoGroupEnabled(): Promise<boolean> {
  const userId = await currentUserId();
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { autoGroupEnabled: true },
  });
  return user.autoGroupEnabled;
}

/**
 * Update the current user's auto-group preference.
 */
export async function updateAutoGroupEnabled(
  enabled: boolean
): Promise<{ success: true }> {
  const userId = await currentUserId();
  await prisma.user.update({
    where: { id: userId },
    data: { autoGroupEnabled: enabled },
  });

  // Fire-and-forget: backfill existing ungrouped bookmarks when enabling
  if (enabled) {
    backfillUngroupedBookmarks(userId).catch(() => {});
  }

  return { success: true };
}
