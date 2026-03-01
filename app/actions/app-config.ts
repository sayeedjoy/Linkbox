"use server";

import { requireAdminSession } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import {
  AppConfigMigrationRequiredError,
  setPublicSignupEnabled,
} from "@/lib/app-config";

export async function updatePublicSignupEnabled(
  enabled: boolean
): Promise<
  | { success: true; publicSignupEnabled: boolean }
  | { success: false; error: string }
> {
  try {
    await requireAdminSession();
    if (!enabled) {
      const totalUsers = await prisma.user.count();
      if (totalUsers <= 1) {
        return {
          success: false as const,
          error:
            "Public signup cannot be disabled while only one account exists.",
        };
      }
    }

    const config = await setPublicSignupEnabled(enabled);
    return {
      success: true as const,
      publicSignupEnabled: config.publicSignupEnabled,
    };
  } catch (error) {
    if (error instanceof AppConfigMigrationRequiredError) {
      return {
        success: false as const,
        error: error.message,
      };
    }

    return {
      success: false as const,
      error: "Failed to update signup setting",
    };
  }
}
