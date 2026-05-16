import Link from "next/link";
import { Header } from "@/components/header";
import { HeroSection } from "@/components/hero";
import { FeatureSection } from "@/components/feature-section";
import { FaqsSection } from "@/components/faqs-section";
import Pricing from "@/components/pricing";
import Footer from "@/components/footer";
import { Preloader } from "@/components/preloader";
import { LandingCtaButtons } from "@/components/landing-cta-buttons";
import { getAllPlansOrdered } from "@/lib/plan-entitlements";

export default async function Page() {
  const plans = await getAllPlansOrdered();
  return (
    <Preloader>
      <main className="min-h-dvh overflow-x-hidden bg-background">
        <Header />
        <HeroSection />
        <section className="border-t py-16 md:py-24">
          <div className="mx-auto max-w-5xl px-4">
            <FeatureSection />
          </div>
        </section>
        <section id="pricing" className="border-t">
          <Pricing plans={plans} />
        </section>
        <section id="faqs" className="border-t py-16 md:py-24">
          <FaqsSection />
        </section>
        <section className="border-t py-16 md:py-24">
          <div className="mx-auto flex max-w-3xl flex-col items-center justify-center px-6 text-center">
            <p className="text-balance text-lg text-muted-foreground">
              Ready to save and organize your bookmarks? Sign in, create an
              account, or jump straight to your workspace.
            </p>
            <LandingCtaButtons />
          </div>
        </section>
        <Footer />
      </main>
    </Preloader>
  );
}
