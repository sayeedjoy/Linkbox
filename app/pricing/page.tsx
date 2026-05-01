import type { Metadata } from "next";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { PricingSection } from "@/components/pricing-section";
import { getAllPlansOrdered } from "@/lib/plan-entitlements";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Choose the plan that fits your bookmarking needs.",
};

export type PlanApiItem = {
  id: string;
  slug: string;
  displayName: string;
  googlePlayProductId: string | null;
  aiGroupingAllowed: boolean;
  groupColoringAllowed: boolean;
  apiQuotaPerDay: number | null;
  sortOrder: number;
};

export default async function PricingPage() {
  const plans = await getAllPlansOrdered();

  return (
    <main className="min-h-dvh overflow-x-hidden bg-background">
      <Header />
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-5xl px-4">
          <div className="mb-12 text-center">
            <h1 className="text-balance text-3xl font-semibold tracking-tight md:text-4xl">
              Simple, transparent pricing
            </h1>
            <p className="mt-4 text-balance text-muted-foreground text-lg">
              Choose the plan that works best for you. All plans include core bookmarking features.
            </p>
          </div>
          <PricingSection plans={plans} />
        </div>
      </section>
      <Footer />
    </main>
  );
}
