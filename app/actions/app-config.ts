"use server";

import { count } from "drizzle-orm";
import { requireAdminSession } from "@/lib/admin";
import { db, users } from "@/lib/db";
import {
  AppConfigMigrationRequiredError,
  setServiceConfig,
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

export async function updateServiceConfig(input: {
  openrouterApiKey?: string;
  clearOpenrouterApiKey?: boolean;
  resendApiKey?: string;
  clearResendApiKey?: boolean;
  resendFromEmail?: string;
}): Promise<
  | {
      success: true;
      openrouterConfigured: boolean;
      resendConfigured: boolean;
      resendFromEmail: string;
    }
  | { success: false; error: string }
> {
  try {
    await requireAdminSession();

    const resendFromEmail = input.resendFromEmail?.trim();
    if (
      resendFromEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resendFromEmail)
    ) {
      return { success: false, error: "Enter a valid Resend sender email." };
    }

    const config = await setServiceConfig({
      openrouterApiKey: input.openrouterApiKey,
      clearOpenrouterApiKey: input.clearOpenrouterApiKey,
      resendApiKey: input.resendApiKey,
      clearResendApiKey: input.clearResendApiKey,
      resendFromEmail,
    });

    return {
      success: true,
      openrouterConfigured: !!config.openrouterApiKey,
      resendConfigured: !!config.resendApiKey,
      resendFromEmail: config.resendFromEmail ?? "",
    };
  } catch (error) {
    if (error instanceof AppConfigMigrationRequiredError) {
      return { success: false, error: error.message };
    }

    return { success: false, error: "Failed to update service settings" };
  }
}
