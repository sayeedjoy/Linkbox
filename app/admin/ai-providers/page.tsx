import type { Metadata } from "next";
import { Suspense } from "react";
import { getServiceConfigForAdmin } from "@/lib/app-config";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AiProvidersCard } from "@/components/admin/ai-providers-card";

export const metadata: Metadata = { title: "AI Providers" };

async function AiProvidersData() {
  const serviceConfig = await getServiceConfigForAdmin();

  return (
    <div className="w-full max-w-5xl space-y-4">
      <AiProvidersCard initialConfig={serviceConfig} />
    </div>
  );
}

export default function AdminAiProvidersPage() {
  return (
    <div className="flex flex-col">
      <AdminPageHeader
        title="AI Providers"
        description="Manage AI provider, model, and provider credentials"
      />
      <div className="flex-1 p-4 sm:p-6">
        <Suspense
          fallback={
            <div className="w-full max-w-5xl space-y-3">
              <div className="h-96 w-full animate-pulse rounded-xl bg-muted" />
            </div>
          }
        >
          <AiProvidersData />
        </Suspense>
      </div>
    </div>
  );
}
