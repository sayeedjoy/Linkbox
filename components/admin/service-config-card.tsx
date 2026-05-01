"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CheckCircle2Icon, KeyRoundIcon, MailIcon, XCircleIcon } from "lucide-react";
import { testSmtpConnection, updateServiceConfig } from "@/app/actions/app-config";
import type { ServiceConfigForAdmin } from "@/lib/app-config";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Props = {
  initialConfig: ServiceConfigForAdmin;
};

export function ServiceConfigCard({ initialConfig }: Props) {
  const [resendConfigured, setResendConfigured] = useState(
    initialConfig.resendConfigured
  );
  const [resendApiKey, setResendApiKey] = useState("");
  const [resendFromEmail, setResendFromEmail] = useState(
    initialConfig.resendFromEmail
  );
  const [clearResendApiKey, setClearResendApiKey] = useState(false);
  const [testStatus, setTestStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isTesting, startTesting] = useTransition();

  function handleSave() {
    startTransition(async () => {
      const result = await updateServiceConfig({
        resendApiKey,
        clearResendApiKey,
        resendFromEmail,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      setResendConfigured(result.resendConfigured);
      setResendFromEmail(result.resendFromEmail);
      setResendApiKey("");
      setClearResendApiKey(false);
      setTestStatus(null);
      toast.success("Service settings saved");
    });
  }

  function handleTestConnection() {
    setTestStatus(null);
    startTesting(async () => {
      const result = await testSmtpConnection({
        resendApiKey: clearResendApiKey ? "" : resendApiKey,
        resendFromEmail,
      });

      if (!result.success) {
        setTestStatus({ type: "error", message: result.error });
        return;
      }

      setTestStatus({ type: "success", message: result.message });
    });
  }

  return (
    <Card size="sm">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold">
              SMTP Configuration
            </CardTitle>
            <CardDescription>
              Confirm SMTP credential status, save credentials, and test the
              Resend connection.
            </CardDescription>
          </div>
          <KeyRoundIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        </div>
      </CardHeader>

      <CardContent className="space-y-4 border-t border-border pt-4">
        <div
          className={cn(
            "flex items-start gap-2 rounded-lg border px-3 py-2 text-xs",
            resendConfigured
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "border-destructive/30 bg-destructive/10 text-destructive"
          )}
        >
          {resendConfigured ? (
            <CheckCircle2Icon className="mt-0.5 size-4 shrink-0" />
          ) : (
            <XCircleIcon className="mt-0.5 size-4 shrink-0" />
          )}
          <div>
            <p className="font-medium">
              {resendConfigured ? "Configured" : "Not configured"}
            </p>
            <p>
              {resendConfigured
                ? "A Resend API key is saved and ready to use."
                : "No Resend API key is saved yet."}
            </p>
          </div>
        </div>

        <div className="space-y-2 rounded-xl border border-border bg-muted/20 p-3">
          <div className="flex items-center justify-between gap-3">
            <Label
              htmlFor="resend-api-key"
              className="flex items-center gap-2 text-sm font-medium"
            >
              <MailIcon className="size-4 text-muted-foreground" />
              Resend API key
            </Label>
            <Badge variant={resendConfigured ? "secondary" : "outline"}>
              {resendConfigured ? "Configured" : "Missing"}
            </Badge>
          </div>
          <Input
            id="resend-api-key"
            type="password"
            value={resendApiKey}
            onChange={(event) => setResendApiKey(event.target.value)}
            placeholder={
              resendConfigured
                ? "Paste a new key to replace the current key"
                : "re_..."
            }
            disabled={isPending || clearResendApiKey}
            autoComplete="off"
          />
          {resendConfigured && (
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Checkbox
                checked={clearResendApiKey}
                onCheckedChange={(checked) => setClearResendApiKey(checked === true)}
                disabled={isPending}
              />
              Clear saved Resend key
            </label>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="resend-from-email" className="text-sm font-medium">
            From email
          </Label>
          <Input
            id="resend-from-email"
            type="email"
            value={resendFromEmail}
            onChange={(event) => setResendFromEmail(event.target.value)}
            placeholder="noreply@example.com"
            disabled={isPending}
          />
          <p className="text-xs text-muted-foreground">
            Used as the sender for password reset and invite emails.
          </p>
        </div>

        <Button
          size="sm"
          className="w-full"
          onClick={handleSave}
          disabled={isPending || isTesting}
        >
          {isPending ? "Saving..." : "Save email settings"}
        </Button>

        <Button
          size="sm"
          variant="outline"
          className="w-full"
          onClick={handleTestConnection}
          disabled={isPending || isTesting}
        >
          {isTesting ? "Testing..." : "Test connection"}
        </Button>

        {testStatus ? (
          <p
            className={cn(
              "text-xs",
              testStatus.type === "success"
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-destructive"
            )}
          >
            {testStatus.message}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
