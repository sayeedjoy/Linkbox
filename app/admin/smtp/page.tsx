import type { Metadata } from "next";
import { Suspense } from "react";
import { getServiceConfigForAdmin } from "@/lib/app-config";
import { ServiceConfigCard } from "@/components/admin/service-config-card";
import { AdminPageHeader } from "@/components/admin/admin-page-header";

export const metadata: Metadata = { title: "SMTP" };

async function SmtpData() {
  const serviceConfig = await getServiceConfigForAdmin();

  return (
    <div className="max-w-2xl space-y-4">
      <ServiceConfigCard initialConfig={serviceConfig} />
    </div>
  );
}

export default function AdminSmtpPage() {
  return (
    <div className="flex flex-col">
      <AdminPageHeader
        title="SMTP"
        description="Manage outgoing email provider credentials"
      />
      <div className="flex-1 p-4 sm:p-6">
        <Suspense
          fallback={
            <div className="max-w-2xl space-y-3">
              <div className="h-80 w-full animate-pulse rounded-xl bg-muted" />
            </div>
          }
        >
          <SmtpData />
        </Suspense>
      </div>
    </div>
  );
}
