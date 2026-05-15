import type { Metadata } from "next";
import { Suspense } from "react";
import { InfoIcon } from "lucide-react";
import { isPublicSignupEnabled } from "@/lib/app-config";
import { PublicSignupCard } from "@/components/admin/public-signup-card";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Settings" };

async function SettingsData() {
  const publicSignupEnabled = await isPublicSignupEnabled();

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <PublicSignupCard initialEnabled={publicSignupEnabled} />

      <Card size="sm">
        <CardHeader>
          <CardTitle>Operational Notes</CardTitle>
          <CardDescription>
            Important reminders for admin actions.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Alert>
            <InfoIcon />
            <AlertTitle>User deletion cascades</AlertTitle>
            <AlertDescription>
              Removes bookmarks, groups, API tokens, and reset tokens through
              relational cascade.
            </AlertDescription>
          </Alert>
          <Alert>
            <InfoIcon />
            <AlertTitle>Shareable filtered views</AlertTitle>
            <AlertDescription>
              Live search updates the URL as you type, so filtered views remain
              shareable and reload safely.
            </AlertDescription>
          </Alert>
          <Alert>
            <InfoIcon />
            <AlertTitle>Admin account is protected</AlertTitle>
            <AlertDescription>
              The current admin account cannot be modified or deleted, in both
              the UI and the server action.
            </AlertDescription>
          </Alert>
          <Alert>
            <InfoIcon />
            <AlertTitle>Email provider credentials</AlertTitle>
            <AlertDescription>
              Managed from the SMTP page. Saved values override environment
              defaults.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <Skeleton className="h-28 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}

export default function AdminSettingsPage() {
  return (
    <div className="flex flex-col">
      <AdminPageHeader
        title="Settings"
        description="Application-wide configuration"
      />
      <div className="flex-1 p-4 sm:p-6">
        <Suspense fallback={<SettingsSkeleton />}>
          <SettingsData />
        </Suspense>
      </div>
    </div>
  );
}
