"use server";

import { count } from "drizzle-orm";
import { requireAdminSession } from "@/lib/admin";
import { db, users } from "@/lib/db";
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
      const [{ value: totalUsers }] = await db.select({ value: count() }).from(users);
      if (totalUsers <= 1) {
        return {
          success: false as const,
          error: "Public signup cannot be disabled while only one account exists.",
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
      return { success: false as const, error: error.message };
    }

    return { success: false as const, error: "Failed to update signup setting" };
  }
}
