"use client";

import Link from "next/link";
import { CheckIcon, XIcon, SparklesIcon, PaletteIcon, ZapIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PlanApiItem } from "@/app/pricing/page";

type PricingFeature = {
  label: string;
  icon: React.ReactNode;
  included: boolean;
  value?: string;
};

function PlanCard({ plan, isPopular }: { plan: PlanApiItem; isPopular?: boolean }) {
  const features: PricingFeature[] = [
    {
      label: "AI auto-grouping",
      icon: <SparklesIcon className="size-4" />,
      included: plan.aiGroupingAllowed,
    },
    {
      label: "Group colors",
      icon: <PaletteIcon className="size-4" />,
      included: plan.groupColoringAllowed,
    },
    {
      label: "API quota",
      icon: <ZapIcon className="size-4" />,
      included: true,
      value:
        plan.apiQuotaPerDay == null
          ? "Unlimited requests / day"
          : `${plan.apiQuotaPerDay} requests / day`,
    },
  ];

  const isFree = plan.slug === "free";

  return (
    <Card
      className={cn(
        "relative flex flex-col overflow-visible",
        isPopular && "border-primary ring-1 ring-primary"
      )}
    >
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge variant="default" className="text-xs">
            Most popular
          </Badge>
        </div>
      )}
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg font-semibold">{plan.displayName}</CardTitle>
          {isPopular ? (
            <Badge variant="secondary" className="text-[10px]">
              Recommended
            </Badge>
          ) : null}
        </div>
        <p className="text-muted-foreground text-sm">
          {isFree ? "Free forever" : "Unlock advanced features"}
        </p>
      </CardHeader>
      <CardContent className="flex-1">
        <ul className="flex flex-col gap-3">
          <li className="flex items-start gap-2 text-sm">
            <CheckIcon className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>Unlimited bookmarks</span>
          </li>
          <li className="flex items-start gap-2 text-sm">
            <CheckIcon className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>Unlimited groups</span>
          </li>
          {features.map((feature) => (
            <li
              key={feature.label}
              className={cn(
                "flex items-start gap-2 text-sm",
                !feature.included && "text-muted-foreground"
              )}
            >
              {feature.included ? (
                <CheckIcon className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <XIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              )}
              <span className="flex items-center gap-1.5">
                {feature.icon}
                {feature.value ?? feature.label}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter className="flex-col gap-2">
        {isFree ? (
          <Button asChild className="w-full" variant="outline">
            <Link href="/sign-up">Get started free</Link>
          </Button>
        ) : (
          <Button asChild className="w-full">
            <Link href="/sign-up">Upgrade</Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

export function PricingSection({ plans }: { plans: PlanApiItem[] }) {
  const sorted = [...plans].sort((a, b) => a.sortOrder - b.sortOrder);

  // Heuristic: mark the non-free plan with the highest sortOrder as popular
  const popularIndex = sorted.findIndex((p) => p.slug !== "free");

  return (
    <div className={cn("grid gap-6 sm:grid-cols-2", sorted.length >= 3 && "lg:grid-cols-3")}>
      {sorted.map((plan, index) => (
        <PlanCard
          key={plan.id}
          plan={plan}
          isPopular={popularIndex === index}
        />
      ))}
    </div>
  );
}
