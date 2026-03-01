"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updatePublicSignupEnabled } from "@/app/actions/app-config";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

export function PublicSignupCard({
  initialEnabled,
}: {
  initialEnabled: boolean;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [isPending, startTransition] = useTransition();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Public Signup</CardTitle>
        <CardDescription>
          Control whether new users can register. Existing users can always sign
          in. Requires the latest database migration.
        </CardDescription>
      </CardHeader>
      <Separator />
      <CardContent className="flex items-center justify-between gap-4 pt-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            {enabled ? "Enabled" : "Disabled"}
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {enabled
              ? "Anyone with access can create an account."
              : "Only existing users can sign in."}
          </p>
        </div>
        <Switch
          checked={enabled}
          disabled={isPending}
          onCheckedChange={(checked) => {
            const previous = enabled;
            setEnabled(checked);
            startTransition(async () => {
              try {
                const result = await updatePublicSignupEnabled(checked);
                if (!result.success) {
                  setEnabled(previous);
                  toast.error(result.error);
                  return;
                }

                setEnabled(result.publicSignupEnabled);
                toast.success(
                  result.publicSignupEnabled
                    ? "Public signup enabled"
                    : "Public signup disabled"
                );
              } catch {
                setEnabled(previous);
                toast.error("Failed to update signup setting");
              }
            });
          }}
          aria-label="Toggle public signup"
        />
      </CardContent>
    </Card>
  );
}
