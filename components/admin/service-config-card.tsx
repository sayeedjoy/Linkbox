"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { KeyRoundIcon, MailIcon, RouterIcon } from "lucide-react";
import { updateServiceConfig } from "@/app/actions/app-config";
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

type Props = {
  initialConfig: ServiceConfigForAdmin;
};

export function ServiceConfigCard({ initialConfig }: Props) {
  const [openrouterConfigured, setOpenrouterConfigured] = useState(
    initialConfig.openrouterConfigured
  );
  const [resendConfigured, setResendConfigured] = useState(
    initialConfig.resendConfigured
  );
  const [openrouterApiKey, setOpenrouterApiKey] = useState("");
  const [resendApiKey, setResendApiKey] = useState("");
  const [resendFromEmail, setResendFromEmail] = useState(
    initialConfig.resendFromEmail
  );
  const [clearOpenrouterApiKey, setClearOpenrouterApiKey] = useState(false);
  const [clearResendApiKey, setClearResendApiKey] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      const result = await updateServiceConfig({
        openrouterApiKey,
        clearOpenrouterApiKey,
        resendApiKey,
        clearResendApiKey,
        resendFromEmail,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      setOpenrouterConfigured(result.openrouterConfigured);
      setResendConfigured(result.resendConfigured);
      setResendFromEmail(result.resendFromEmail);
      setOpenrouterApiKey("");
      setResendApiKey("");
      setClearOpenrouterApiKey(false);
      setClearResendApiKey(false);
      toast.success("Service settings saved");
    });
  }

  return (
    <Card size="sm">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold">
              Service Credentials
            </CardTitle>
            <CardDescription>
              Manage OpenRouter and Resend without editing environment files.
              Existing keys are never displayed.
            </CardDescription>
          </div>
          <KeyRoundIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        </div>
      </CardHeader>

      <CardContent className="space-y-4 border-t border-border pt-4">
        <div className="space-y-2 rounded-xl border border-border bg-muted/20 p-3">
          <div className="flex items-center justify-between gap-3">
            <Label
              htmlFor="openrouter-api-key"
              className="flex items-center gap-2 text-sm font-medium"
            >
              <RouterIcon className="size-4 text-muted-foreground" />
              OpenRouter API key
            </Label>
            <Badge variant={openrouterConfigured ? "secondary" : "outline"}>
              {openrouterConfigured ? "Configured" : "Missing"}
            </Badge>
          </div>
          <Input
            id="openrouter-api-key"
            type="password"
            value={openrouterApiKey}
            onChange={(event) => setOpenrouterApiKey(event.target.value)}
            placeholder={
              openrouterConfigured
                ? "Paste a new key to replace the current key"
                : "sk-or-v1-..."
            }
            disabled={isPending || clearOpenrouterApiKey}
            autoComplete="off"
          />
          {openrouterConfigured && (
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Checkbox
                checked={clearOpenrouterApiKey}
                onCheckedChange={(checked) =>
                  setClearOpenrouterApiKey(checked === true)
                }
                disabled={isPending}
              />
              Clear saved OpenRouter key
            </label>
          )}
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
          disabled={isPending}
        >
          {isPending ? "Saving..." : "Save service credentials"}
        </Button>
      </CardContent>
    </Card>
  );
}
