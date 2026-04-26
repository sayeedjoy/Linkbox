import type { Metadata } from "next";
import { Suspense } from "react";
import { getAdsConfig } from "@/lib/ads-config";
import { AdsConfigCard } from "@/components/admin/ads-config-card";
import { AdminPageHeader } from "@/components/admin/admin-page-header";

export const metadata: Metadata = { title: "Ads" };

async function AdsData() {
  const config = await getAdsConfig();
  return (
    <div className="max-w-lg">
      <AdsConfigCard initialConfig={config} />
    </div>
  );
}

export default function AdminAdsPage() {
  return (
    <div className="flex flex-col">
      <AdminPageHeader
        title="Ads (AdMob)"
        description="Manage Google AdMob ad unit IDs"
      />
      <div className="flex-1 p-4 sm:p-6">
        <Suspense
          fallback={
            <div className="max-w-lg">
              <div className="h-96 w-full animate-pulse rounded-xl bg-muted" />
            </div>
          }
        >
          <AdsData />
        </Suspense>
      </div>
    </div>
  );
}
