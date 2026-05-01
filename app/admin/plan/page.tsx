import type { Metadata } from "next";
import { Suspense } from "react";
import { InfoIcon } from "lucide-react";
import { getPlansForAdmin } from "@/app/actions/admin-plans";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { PlansAdminCard } from "@/components/admin/plans-admin-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Plans" };

async function PlansData() {
  const plans = await getPlansForAdmin();
  return <PlansAdminCard plans={plans} />;
}

function PlansFallback() {
  return (
    <div className="flex flex-col gap-4">
      {[0, 1].map((i) => (
        <Card key={i} size="sm" className="overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48" />
              </div>
              <Skeleton className="size-9 rounded-lg" />
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 border-t border-border pt-4">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-9 w-2/3" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function AdminPlansPage() {
  return (
    <div className="flex flex-col">
      <AdminPageHeader
        title="Plans"
        description="Subscription packages, feature flags, and Play product mapping"
      />
      <div className="flex-1 p-4 sm:p-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          <Card size="sm" className="border-dashed bg-muted/30">
            <CardHeader className="pb-2">
              <div className="flex items-start gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground">
                  <InfoIcon className="size-4" />
                </div>
                <div className="flex flex-col gap-1">
                  <CardTitle className="text-sm font-semibold">
                    How plans work
                  </CardTitle>
                  <CardDescription className="text-xs leading-relaxed">
                    Internal slugs are immutable and referenced from code. Map
                    a plan to a Google Play subscription product ID to enable
                    in-app purchase upgrades. Feature flags here override
                    behavior for every user assigned to the plan.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Suspense fallback={<PlansFallback />}>
            <PlansData />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
