import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

export type AdsConfig = {
  id: number;
  adsEnabled: boolean;
  androidAppId: string | null;
  androidBannerId: string | null;
  androidInterstitialId: string | null;
  androidAppOpenId: string | null;
  androidRewardedId: string | null;
};

export class AdsConfigMigrationRequiredError extends Error {
  constructor() {
    super(
      "Ads configuration is unavailable until the latest database migration is applied. Run migrations and try again."
    );
    this.name = "AdsConfigMigrationRequiredError";
  }
}

const ADS_CONFIG_ID = 1;

const DEFAULT_CONFIG: AdsConfig = {
  id: ADS_CONFIG_ID,
  adsEnabled: false,
  androidAppId: null,
  androidBannerId: null,
  androidInterstitialId: null,
  androidAppOpenId: null,
  androidRewardedId: null,
};

function isAdsConfigMissingError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return msg.includes('relation "AdsConfig" does not exist');
}

export async function getAdsConfig(): Promise<AdsConfig> {
  try {
    const rows = await db.execute<AdsConfig>(
      sql`SELECT "id", "adsEnabled", "androidAppId", "androidBannerId", "androidInterstitialId", "androidAppOpenId", "androidRewardedId" FROM "AdsConfig" WHERE "id" = ${ADS_CONFIG_ID} LIMIT 1`
    );
    return (rows.rows[0] as AdsConfig | undefined) ?? DEFAULT_CONFIG;
  } catch (e) {
    if (isAdsConfigMissingError(e)) return DEFAULT_CONFIG;
    throw e;
  }
}

export type UpdateAdsConfigInput = Omit<AdsConfig, "id">;

export async function setAdsConfig(input: UpdateAdsConfigInput): Promise<AdsConfig> {
  try {
    const rows = await db.execute<AdsConfig>(
      sql`INSERT INTO "AdsConfig" ("id", "adsEnabled", "androidAppId", "androidBannerId", "androidInterstitialId", "androidAppOpenId", "androidRewardedId")
          VALUES (
            ${ADS_CONFIG_ID},
            ${input.adsEnabled},
            ${input.androidAppId ?? null},
            ${input.androidBannerId ?? null},
            ${input.androidInterstitialId ?? null},
            ${input.androidAppOpenId ?? null},
            ${input.androidRewardedId ?? null}
          )
          ON CONFLICT ("id") DO UPDATE SET
            "adsEnabled" = EXCLUDED."adsEnabled",
            "androidAppId" = EXCLUDED."androidAppId",
            "androidBannerId" = EXCLUDED."androidBannerId",
            "androidInterstitialId" = EXCLUDED."androidInterstitialId",
            "androidAppOpenId" = EXCLUDED."androidAppOpenId",
            "androidRewardedId" = EXCLUDED."androidRewardedId"
          RETURNING "id", "adsEnabled", "androidAppId", "androidBannerId", "androidInterstitialId", "androidAppOpenId", "androidRewardedId"`
    );
    return (rows.rows[0] as AdsConfig | undefined) ?? { id: ADS_CONFIG_ID, ...input };
  } catch (e) {
    if (isAdsConfigMissingError(e)) throw new AdsConfigMigrationRequiredError();
    throw e;
  }
}
