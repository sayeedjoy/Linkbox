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
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";

export function PublicSignupCard({
  initialEnabled,
}: {
  initialEnabled: boolean;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [isPending, startTransition] = useTransition();

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Public Signup</CardTitle>
        <CardDescription>
          Control whether new users can register. Existing users can always sign
          in. Requires the latest database migration.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Field orientation="horizontal" data-disabled={isPending || undefined}>
          <FieldContent>
            <FieldLabel htmlFor="public-signup">
              {enabled ? "Enabled" : "Disabled"}
            </FieldLabel>
            <p className="text-sm text-muted-foreground">
              {enabled
                ? "Anyone with access can create an account."
                : "Only existing users can sign in."}
            </p>
          </FieldContent>
          <Switch
            id="public-signup"
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
        </Field>
      </CardContent>
    </Card>
  );
}
