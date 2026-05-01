import type { Metadata } from "next";
import { Suspense } from "react";
import { isPublicSignupEnabled } from "@/lib/app-config";
import { PublicSignupCard } from "@/components/admin/public-signup-card";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Settings" };

async function SettingsData() {
  const publicSignupEnabled = await isPublicSignupEnabled();

  return (
    <div className="max-w-2xl space-y-4">
      <PublicSignupCard initialEnabled={publicSignupEnabled} />

      <Card size="sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Operational Notes</CardTitle>
          <CardDescription>Important reminders for admin actions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">
          <p>
            Deleting a user removes their bookmarks, groups, API tokens, and reset
            tokens through relational cascade.
          </p>
          <p>
            Live search updates the URL as you type, so filtered views remain
            shareable and reload safely.
          </p>
          <p>
            The current admin account is protected in both the UI and the server
            action.
          </p>
          <p>
            Email provider credentials are managed from the SMTP page. Saved values
            override environment defaults.
          </p>
        </CardContent>
      </Card>
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
        <Suspense
          fallback={
            <div className="max-w-2xl space-y-3">
              <div className="h-28 w-full animate-pulse rounded-xl bg-muted" />
              <div className="h-40 w-full animate-pulse rounded-xl bg-muted" />
            </div>
          }
        >
          <SettingsData />
        </Suspense>
      </div>
    </div>
  );
}
