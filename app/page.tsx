import Link from "next/link";
import { Header } from "@/components/header";
import { HeroSection } from "@/components/hero";
import { FeatureSection } from "@/components/feature-section";
import { FaqsSection } from "@/components/faqs-section";
import Pricing from "@/components/pricing";
import Footer from "@/components/footer";
import { OpenSource } from "@/components/open-source";
import { GetProduct } from "@/components/get-product";
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
        <section className="py-16 md:py-24">
          <div className="mx-auto max-w-5xl px-4">
            <FeatureSection />
          </div>
        </section>
        <section id="pricing">
          <Pricing plans={plans} />
        </section>
        <GetProduct />
        <section id="faqs" className="py-16 md:py-24">
          <FaqsSection />
        </section>
        <OpenSource />
        <Footer />
      </main>
    </Preloader>
  );
}
