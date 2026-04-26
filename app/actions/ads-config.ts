"use server";

import { requireAdminSession } from "@/lib/admin";
import {
  AdsConfigMigrationRequiredError,
  setAdsConfig,
  type UpdateAdsConfigInput,
} from "@/lib/ads-config";

export async function updateAdsConfig(
  input: UpdateAdsConfigInput
): Promise<
  | { success: true; config: UpdateAdsConfigInput & { id: number } }
  | { success: false; error: string }
> {
  try {
    await requireAdminSession();
    const config = await setAdsConfig(input);
    return { success: true as const, config };
  } catch (error) {
    if (error instanceof AdsConfigMigrationRequiredError) {
      return { success: false as const, error: error.message };
    }
    return { success: false as const, error: "Failed to update ads configuration" };
  }
}
