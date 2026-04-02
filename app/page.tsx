import Link from "next/link";
import { Header } from "@/components/header";
import { HeroSection } from "@/components/hero";
import { FeatureSection } from "@/components/feature-section";
import { Integrations } from "@/components/integrations";
import { FaqsSection } from "@/components/faqs-section";
import { Footer } from "@/components/footer";
import { Preloader } from "@/components/preloader";
import { LandingCtaButtons } from "@/components/landing-cta-buttons";

export default function Page() {
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
        <section id="integrations" className="border-t py-16 md:py-24">
          <div className="mx-auto max-w-5xl px-4">
            <h2 className="mb-8 text-center font-medium text-2xl md:text-3xl">
              How it works
            </h2>
            <Integrations />
          </div>
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
