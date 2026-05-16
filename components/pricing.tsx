"use client";

import Link from "next/link";
import { useState } from "react";
import {
  CircleCheck,
  DownloadIcon,
  PaletteIcon,
  RefreshCwIcon,
  SparklesIcon,
  XIcon,
  ZapIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export type PlanApiItem = {
  id: string;
  slug: string;
  displayName: string;
  googlePlayProductId: string | null;
  aiGroupingAllowed: boolean;
  groupColoringAllowed: boolean;
  browserBulkImportAllowed: boolean;
  browserRealtimeSyncAllowed: boolean;
  bookmarkQuotaPerMonth: number | null;
  sortOrder: number;
};

type BillingPeriod = "monthly" | "yearly";

type PricingFeature = {
  label: string;
  icon: React.ReactNode;
  included: boolean;
};

const PRO_MONTHLY = 5;
const PRO_YEARLY_PER_MONTH = 4;
const PRO_YEARLY_TOTAL = PRO_YEARLY_PER_MONTH * 12;

function buildFeatures(plan: PlanApiItem): PricingFeature[] {
  return [
    {
      label:
        plan.bookmarkQuotaPerMonth == null
          ? "Unlimited bookmarks per month"
          : `${plan.bookmarkQuotaPerMonth} bookmarks per month`,
      icon: <ZapIcon className="size-4" />,
      included: true,
    },
    {
      label: "Unlimited groups",
      icon: <CircleCheck className="size-4" />,
      included: true,
    },
    {
      label: "Group colors",
      icon: <PaletteIcon className="size-4" />,
      included: plan.groupColoringAllowed,
    },
    {
      label: "Bulk import browser bookmarks",
      icon: <DownloadIcon className="size-4" />,
      included: plan.browserBulkImportAllowed,
    },
    {
      label: "Realtime browser auto-sync",
      icon: <RefreshCwIcon className="size-4" />,
      included: plan.browserRealtimeSyncAllowed,
    },
    {
      label: "AI auto-grouping",
      icon: <SparklesIcon className="size-4" />,
      included: plan.aiGroupingAllowed,
    },
  ];
}

function PriceDisplay({
  plan,
  period,
}: {
  plan: PlanApiItem;
  period: BillingPeriod;
}) {
  const isFree = plan.slug === "free";

  if (isFree) {
    return (
      <div className="mt-4 flex items-baseline gap-1">
        <span className="font-satoshi font-semibold text-4xl">$0</span>
        <span className="text-muted-foreground">/ forever</span>
      </div>
    );
  }

  const price = period === "monthly" ? PRO_MONTHLY : PRO_YEARLY_PER_MONTH;

  return (
    <div className="mt-4">
      <div className="flex items-baseline gap-1">
        <span className="font-satoshi font-semibold text-4xl">${price}</span>
        <span className="text-muted-foreground">/ month</span>
      </div>
      {period === "yearly" && (
        <p className="mt-1 text-muted-foreground text-sm">
          Billed ${PRO_YEARLY_TOTAL} yearly
        </p>
      )}
    </div>
  );
}

const Pricing = ({ plans }: { plans: PlanApiItem[] }) => {
  const [period, setPeriod] = useState<BillingPeriod>("monthly");

  const sorted = [...plans].sort((a, b) => a.sortOrder - b.sortOrder);
  const popularIndex = sorted.findIndex((p) => p.slug !== "free");

  return (
    <div className="px-6 py-20">
      <h2 className="text-center font-medium text-4xl tracking-[-0.04em] sm:text-[2.75rem]">
        Our Plans
      </h2>
      <p className="mt-3 text-center text-muted-foreground text-xl -tracking-[0.01em] md:text-2xl">
        Choose the plan that fits your needs
      </p>

      <div className="mt-8 flex justify-center">
        <div className="inline-flex items-center gap-1 rounded-full border bg-muted/40 p-1">
          {(["monthly", "yearly"] as const).map((value) => (
            <button
              className={cn(
                "rounded-full px-4 py-1.5 font-medium text-sm transition-colors",
                period === value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              key={value}
              onClick={() => setPeriod(value)}
              type="button"
            >
              {value === "monthly" ? "Monthly" : "Yearly"}
              {value === "yearly" && (
                <Badge className="ml-2" variant="secondary">
                  Save 20%
                </Badge>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto mt-12 grid max-w-(--breakpoint-md) grid-cols-1 items-center gap-10 sm:mt-16 sm:grid-cols-2 sm:gap-0">
        {sorted.map((plan, index) => {
          const isPopular = index === popularIndex;
          const isFree = plan.slug === "free";
          const features = buildFeatures(plan);

          return (
            <div
              className={cn(
                "relative rounded-xl border bg-card/50 p-7 sm:rounded-none sm:first:rounded-l-xl sm:last:rounded-r-xl",
                {
                  "rounded-xl! border-2 border-primary bg-card py-12": isPopular,
                }
              )}
              key={plan.id}
            >
              {isPopular && (
                <Badge className="-translate-y-1/2 absolute top-0 right-1/2 translate-x-1/2">
                  Most Popular
                </Badge>
              )}
              <h3 className="font-medium text-lg">{plan.displayName}</h3>
              <PriceDisplay period={period} plan={plan} />
              <p className="mt-4 text-muted-foreground">
                {isFree
                  ? "Everything you need to start organizing your links."
                  : "Unlock advanced features and higher limits."}
              </p>
              <Separator className="my-6" />
              <ul className="space-y-2">
                {features.map((feature) => (
                  <li
                    className={cn(
                      "flex items-start gap-2",
                      !feature.included && "text-muted-foreground"
                    )}
                    key={feature.label}
                  >
                    {feature.included ? (
                      <CircleCheck className="mt-1 h-4 w-4 shrink-0 text-green-600" />
                    ) : (
                      <XIcon className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <span>{feature.label}</span>
                  </li>
                ))}
              </ul>
              <Button
                asChild
                className="mt-6 w-full"
                size="lg"
                variant={isPopular ? "default" : "outline"}
              >
                <Link href="/sign-up">
                  {isFree ? "Get started free" : "Upgrade to Pro"}
                </Link>
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Pricing;
