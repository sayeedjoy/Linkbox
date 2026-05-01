"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { BrainCircuitIcon, CheckCircle2Icon, KeyRoundIcon, RouterIcon, ShieldAlertIcon } from "lucide-react";
import { testAiProviderConnection, updateServiceConfig } from "@/app/actions/app-config";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  initialConfig: ServiceConfigForAdmin;
};

export function AiProvidersCard({ initialConfig }: Props) {
  const [aiProvider, setAiProvider] = useState<"openrouter" | "groq">(
    initialConfig.aiProvider
  );
  const [aiModel, setAiModel] = useState(initialConfig.aiModel);
  const [openrouterConfigured, setOpenrouterConfigured] = useState(
    initialConfig.openrouterConfigured
  );
  const [groqConfigured, setGroqConfigured] = useState(
    initialConfig.groqConfigured
  );
  const [openrouterApiKey, setOpenrouterApiKey] = useState("");
  const [groqApiKey, setGroqApiKey] = useState("");
  const [clearOpenrouterApiKey, setClearOpenrouterApiKey] = useState(false);
  const [clearGroqApiKey, setClearGroqApiKey] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isTesting, startTesting] = useTransition();

  function handleSave() {
    startTransition(async () => {
      const result = await updateServiceConfig({
        aiProvider,
        aiModel,
        openrouterApiKey,
        clearOpenrouterApiKey,
        groqApiKey,
        clearGroqApiKey,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      setAiProvider(result.aiProvider);
      setAiModel(result.aiModel);
      setOpenrouterConfigured(result.openrouterConfigured);
      setGroqConfigured(result.groqConfigured);
      setOpenrouterApiKey("");
      setGroqApiKey("");
      setClearOpenrouterApiKey(false);
      setClearGroqApiKey(false);
      toast.success("AI settings saved");
    });
  }

  function handleTestConnection() {
    startTesting(async () => {
      const result = await testAiProviderConnection();
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message);
    });
  }

  const isOpenrouterActive = aiProvider === "openrouter";
  const isGroqActive = aiProvider === "groq";

  return (
    <Card size="sm">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold">AI Providers</CardTitle>
            <CardDescription>
              Choose the AI provider and model, and manage provider API keys.
            </CardDescription>
          </div>
          <KeyRoundIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        </div>
      </CardHeader>

      <CardContent className="space-y-4 border-t border-border pt-4">
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <BrainCircuitIcon className="size-4 text-primary" />
              Active provider: {isGroqActive ? "Groq" : "OpenRouter"}
            </div>
            <Badge variant="secondary">Model: {aiModel}</Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            The active provider key is{" "}
            {isGroqActive
              ? groqConfigured
                ? "configured"
                : "missing"
              : openrouterConfigured
                ? "configured"
                : "missing"}
            .
          </p>
        </div>

        <div className="space-y-2 rounded-xl border border-border bg-muted/20 p-3">
          <div className="flex items-center justify-between gap-3">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <BrainCircuitIcon className="size-4 text-muted-foreground" />
              AI provider and model
            </Label>
            <Badge variant="outline">{aiProvider === "groq" ? "Groq" : "OpenRouter"}</Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ai-provider" className="text-xs text-muted-foreground">
                Provider
              </Label>
              <Select
                value={aiProvider}
                onValueChange={(value: "openrouter" | "groq") => setAiProvider(value)}
                disabled={isPending}
              >
                <SelectTrigger id="ai-provider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openrouter">OpenRouter</SelectItem>
                  <SelectItem value="groq">Groq</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ai-model" className="text-xs text-muted-foreground">
                Model ID
              </Label>
              <Input
                id="ai-model"
                value={aiModel}
                onChange={(event) => setAiModel(event.target.value)}
                placeholder={aiProvider === "groq" ? "llama-3.1-8b-instant" : "google/gemini-2.0-flash-001"}
                disabled={isPending}
              />
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div
            className={`space-y-2 rounded-xl border p-3 ${
              isOpenrouterActive
                ? "border-primary/40 bg-primary/5"
                : "border-border bg-muted/20"
            }`}
          >
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
              placeholder={openrouterConfigured ? "Paste a new key to replace the current key" : "sk-or-v1-..."}
              disabled={isPending || clearOpenrouterApiKey}
              autoComplete="off"
            />
            {openrouterConfigured && (
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Checkbox
                  checked={clearOpenrouterApiKey}
                  onCheckedChange={(checked) => setClearOpenrouterApiKey(checked === true)}
                  disabled={isPending}
                />
                Clear saved OpenRouter key
              </label>
            )}
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {openrouterConfigured ? (
                <CheckCircle2Icon className="size-3.5 text-emerald-600" />
              ) : (
                <ShieldAlertIcon className="size-3.5 text-amber-600" />
              )}
              {isOpenrouterActive ? "Active provider key status." : "Available as fallback provider."}
            </p>
          </div>

          <div
            className={`space-y-2 rounded-xl border p-3 ${
              isGroqActive ? "border-primary/40 bg-primary/5" : "border-border bg-muted/20"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <Label
                htmlFor="groq-api-key"
                className="flex items-center gap-2 text-sm font-medium"
              >
                <RouterIcon className="size-4 text-muted-foreground" />
                Groq API key
              </Label>
              <Badge variant={groqConfigured ? "secondary" : "outline"}>
                {groqConfigured ? "Configured" : "Missing"}
              </Badge>
            </div>
            <Input
              id="groq-api-key"
              type="password"
              value={groqApiKey}
              onChange={(event) => setGroqApiKey(event.target.value)}
              placeholder={groqConfigured ? "Paste a new key to replace the current key" : "gsk_..."}
              disabled={isPending || clearGroqApiKey}
              autoComplete="off"
            />
            {groqConfigured && (
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Checkbox
                  checked={clearGroqApiKey}
                  onCheckedChange={(checked) => setClearGroqApiKey(checked === true)}
                  disabled={isPending}
                />
                Clear saved Groq key
              </label>
            )}
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {groqConfigured ? (
                <CheckCircle2Icon className="size-3.5 text-emerald-600" />
              ) : (
                <ShieldAlertIcon className="size-3.5 text-amber-600" />
              )}
              {isGroqActive ? "Active provider key status." : "Available as fallback provider."}
            </p>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            size="sm"
            className="w-full"
            onClick={handleSave}
            disabled={isPending || isTesting}
          >
            {isPending ? "Saving..." : "Save AI settings"}
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
        </div>
      </CardContent>
    </Card>
  );
}
