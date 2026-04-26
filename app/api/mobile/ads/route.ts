import { NextResponse } from "next/server";
import { connection } from "next/server";
import { getAdsConfig } from "@/lib/ads-config";

export async function GET() {
  await connection();
  const config = await getAdsConfig();

  return NextResponse.json({
    adsEnabled: config.adsEnabled,
    admob: {
      android: {
        appId: config.androidAppId,
        bannerId: config.androidBannerId,
        interstitialId: config.androidInterstitialId,
        appOpenId: config.androidAppOpenId,
        rewardedId: config.androidRewardedId,
      },
    },
  });
}
