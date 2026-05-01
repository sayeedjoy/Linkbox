"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  BookmarkIcon,
  CrownIcon,
  LayersIcon,
  PaletteIcon,
  RotateCcwIcon,
  SaveIcon,
  SparklesIcon,
} from "lucide-react";
import { updatePlanAsAdmin, type AdminPlanRow } from "@/app/actions/admin-plans";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

function PlanSlugIcon({ slug, className }: { slug: string; className?: string }) {
  switch (slug) {
    case "free":
      return <BookmarkIcon className={className} />;
    case "premium":
      return <CrownIcon className={className} />;
    default:
      return <LayersIcon className={className} />;
  }
}

function PlanEditor({ initial }: { initial: AdminPlanRow }) {
  const initialQuotaText = initial.apiQuotaPerDay == null ? "" : String(initial.apiQuotaPerDay);
  const initialIsUnlimited = initial.apiQuotaPerDay == null;
  const initialGp = initial.googlePlayProductId ?? "";

  const [displayName, setDisplayName] = useState(initial.displayName);
  const [googlePlayProductId, setGooglePlayProductId] = useState(initialGp);
  const [aiGroupingAllowed, setAiGroupingAllowed] = useState(initial.aiGroupingAllowed);
  const [groupColoringAllowed, setGroupColoringAllowed] = useState(
    initial.groupColoringAllowed
  );
  const [apiQuotaInput, setApiQuotaInput] = useState(initialQuotaText);
  const [isUnlimited, setIsUnlimited] = useState(initialIsUnlimited);
  const [isPending, startTransition] = useTransition();

  const isPremiumLike = initial.slug === "premium";
  const trimmedDisplayName = displayName.trim();
  const trimmedGp = googlePlayProductId.trim();
  const isMappedToPlay = trimmedGp.length > 0;

  const isDirty = useMemo(() => {
    if (trimmedDisplayName !== initial.displayName) return true;
    if (trimmedGp !== initialGp.trim()) return true;
    if (aiGroupingAllowed !== initial.aiGroupingAllowed) return true;
    if (groupColoringAllowed !== initial.groupColoringAllowed) return true;
    if (isUnlimited !== initialIsUnlimited) return true;
    if (!isUnlimited && apiQuotaInput.trim() !== initialQuotaText) return true;
    return false;
  }, [
    trimmedDisplayName,
    trimmedGp,
    aiGroupingAllowed,
    groupColoringAllowed,
    isUnlimited,
    apiQuotaInput,
    initial.displayName,
    initialGp,
    initial.aiGroupingAllowed,
    initial.groupColoringAllowed,
    initialIsUnlimited,
    initialQuotaText,
  ]);

  function computeQuota(): { ok: true; value: number | null } | { ok: false } {
    if (isUnlimited) return { ok: true, value: null };
    const t = apiQuotaInput.trim();
    if (!t) return { ok: true, value: null };
    const n = Number.parseInt(t, 10);
    if (!Number.isFinite(n) || n < 0 || String(n) !== t) return { ok: false };
    return { ok: true, value: n };
  }

  function handleReset() {
    setDisplayName(initial.displayName);
    setGooglePlayProductId(initialGp);
    setAiGroupingAllowed(initial.aiGroupingAllowed);
    setGroupColoringAllowed(initial.groupColoringAllowed);
    setApiQuotaInput(initialQuotaText);
    setIsUnlimited(initialIsUnlimited);
  }

  function handleSave() {
    if (!trimmedDisplayName) {
      toast.error("Display name is required.");
      return;
    }
    const quota = computeQuota();
    if (!quota.ok) {
      toast.error("API quota must be a non-negative whole number.");
      return;
    }

    startTransition(async () => {
      const result = await updatePlanAsAdmin({
        id: initial.id,
        displayName: trimmedDisplayName,
        googlePlayProductId: trimmedGp || null,
        aiGroupingAllowed,
        groupColoringAllowed,
        apiQuotaPerDay: quota.value,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`Saved “${trimmedDisplayName}”`);
    });
  }

  const titleLabel = trimmedDisplayName || initial.displayName;
  const aiId = `plan-${initial.id}-ai`;
  const colorsId = `plan-${initial.id}-colors`;
  const quotaId = `plan-${initial.id}-quota`;
  const unlimitedId = `plan-${initial.id}-unlimited`;
  const nameId = `plan-${initial.id}-name`;
  const gpId = `plan-${initial.id}-gp`;

  return (
    <AccordionItem value={initial.id} className="border-none">
      <Card size="sm">
        <CardHeader className="pb-3">
          <AccordionTrigger className="py-0 hover:no-underline">
            <div className="flex min-w-0 items-start gap-3">
              <div
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-lg border",
                  isPremiumLike
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border bg-muted/40 text-muted-foreground"
                )}
              >
                <PlanSlugIcon slug={initial.slug} className="size-4" />
              </div>
              <div className="flex min-w-0 flex-col gap-1">
                <CardTitle className="truncate text-sm font-semibold">
                  {titleLabel}
                </CardTitle>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="secondary" className="font-mono text-[10px]">
                    {initial.slug}
                  </Badge>
                  <Badge
                    variant={isMappedToPlay ? "default" : "outline"}
                    className="text-[10px]"
                  >
                    {isMappedToPlay ? "Mapped to Play" : "No Play product"}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {isUnlimited ? "Unlimited API" : `${apiQuotaInput || "0"} req/day`}
                  </Badge>
                </div>
              </div>
            </div>
          </AccordionTrigger>
        </CardHeader>

        <AccordionContent className="pb-0">
          <CardContent className="border-t border-border pt-4">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor={nameId}>Display name</FieldLabel>
            <Input
              id={nameId}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Pro"
              disabled={isPending}
            />
            <FieldDescription>
              Shown to users in the app and on upgrade screens.
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor={gpId}>Google Play product ID</FieldLabel>
            <Input
              id={gpId}
              value={googlePlayProductId}
              onChange={(e) => setGooglePlayProductId(e.target.value)}
              placeholder="e.g. premium_monthly"
              className="font-mono text-xs"
              disabled={isPending}
              autoComplete="off"
              spellCheck={false}
            />
            <FieldDescription>
              Must match the subscription product ID in Play Console. Leave
              empty if this plan is not sold via Google Play.
            </FieldDescription>
          </Field>

          <FieldSet>
            <FieldLegend variant="label">Entitlements</FieldLegend>
            <FieldDescription>
              Toggles apply to every user assigned to this plan.
            </FieldDescription>
            <FieldGroup>
              <Field orientation="horizontal">
                <FieldContent>
                  <FieldLabel htmlFor={aiId} className="flex items-center gap-2">
                    <SparklesIcon className="size-3.5 text-muted-foreground" />
                    AI auto-grouping
                  </FieldLabel>
                  <FieldDescription>
                    Allow these users to auto-categorize bookmarks with AI.
                  </FieldDescription>
                </FieldContent>
                <Switch
                  id={aiId}
                  checked={aiGroupingAllowed}
                  onCheckedChange={setAiGroupingAllowed}
                  disabled={isPending}
                />
              </Field>

              <Field orientation="horizontal">
                <FieldContent>
                  <FieldLabel htmlFor={colorsId} className="flex items-center gap-2">
                    <PaletteIcon className="size-3.5 text-muted-foreground" />
                    Bookmark group colors
                  </FieldLabel>
                  <FieldDescription>
                    Allow these users to assign custom colors to groups.
                  </FieldDescription>
                </FieldContent>
                <Switch
                  id={colorsId}
                  checked={groupColoringAllowed}
                  onCheckedChange={setGroupColoringAllowed}
                  disabled={isPending}
                />
              </Field>
            </FieldGroup>
          </FieldSet>

          <Field>
            <FieldLabel htmlFor={quotaId}>API quota</FieldLabel>
            <InputGroup
              className={cn(isUnlimited && "opacity-60")}
            >
              <InputGroupInput
                id={quotaId}
                type="text"
                inputMode="numeric"
                value={isUnlimited ? "" : apiQuotaInput}
                onChange={(e) => setApiQuotaInput(e.target.value)}
                placeholder={isUnlimited ? "No daily cap" : "e.g. 1000"}
                disabled={isPending || isUnlimited}
                autoComplete="off"
              />
              <InputGroupAddon align="inline-end">
                <InputGroupText>req / day · UTC</InputGroupText>
              </InputGroupAddon>
            </InputGroup>
            <Field orientation="horizontal" className="pt-1">
              <FieldContent>
                <FieldLabel htmlFor={unlimitedId} className="text-xs font-normal text-muted-foreground">
                  Unlimited (no daily cap)
                </FieldLabel>
              </FieldContent>
              <Switch
                id={unlimitedId}
                size="sm"
                checked={isUnlimited}
                onCheckedChange={setIsUnlimited}
                disabled={isPending}
              />
            </Field>
          </Field>
        </FieldGroup>
          </CardContent>

          <CardFooter className="justify-between gap-2">
            {isDirty ? (
              <Badge variant="outline" className="text-[10px]">
                Unsaved changes
              </Badge>
            ) : (
              <p className="text-xs text-muted-foreground">All changes saved</p>
            )}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleReset}
                disabled={!isDirty || isPending}
              >
                <RotateCcwIcon data-icon="inline-start" />
                Reset
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!isDirty || isPending}
              >
                {isPending ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <SaveIcon data-icon="inline-start" />
                )}
                {isPending ? "Saving…" : "Save plan"}
              </Button>
            </div>
          </CardFooter>
        </AccordionContent>
      </Card>
    </AccordionItem>
  );
}

export function PlansAdminCard({ plans }: { plans: AdminPlanRow[] }) {
  const defaultExpanded = plans[0] ? [plans[0].id] : [];

  return (
    <Accordion
      type="multiple"
      defaultValue={defaultExpanded}
      className="grid items-start gap-4 md:grid-cols-2"
    >
      {plans.map((p) => (
        <PlanEditor key={p.id} initial={p} />
      ))}
    </Accordion>
  );
}
