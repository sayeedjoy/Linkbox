"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { Prisma } from "@/app/generated/prisma/client";
import { requireAdminSession } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function deleteUserAsAdmin(
  userId: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const session = await requireAdminSession();
    const targetUserId = userId.trim();

    if (!targetUserId) {
      return {
        success: false,
        error: "User not found.",
      };
    }

    if (session.user.id === targetUserId) {
      return {
        success: false,
        error: "You cannot delete your own account from the admin panel.",
      };
    }

    await prisma.user.delete({
      where: { id: targetUserId },
    });

    revalidatePath("/admin");
    revalidateTag("admin-stats", "max");

    return { success: true };
  } catch (error) {
    unstable_rethrow(error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return {
        success: false,
        error: "User not found.",
      };
    }

    return {
      success: false,
      error: "Failed to delete user.",
    };
  }
}
