import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { SystemHealthCard } from "@/components/admin/system-health-card";
import { AdminPageHeader } from "@/components/admin/admin-page-header";

export const metadata: Metadata = { title: "System Health" };

export default async function AdminSystemPage() {
  await connection();

  return (
    <div className="flex flex-col">
      <AdminPageHeader
        title="System Health"
        description="Service configuration and connectivity"
      />
      <div className="flex-1 p-4 sm:p-6">
        <div className="max-w-lg">
          <Suspense
            fallback={
              <div className="h-64 w-full animate-pulse rounded-xl bg-muted" />
            }
          >
            <SystemHealthCard />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
