import Link from "next/link";
import { headers } from "next/headers";
import { Header } from "@/components/header";
import { HeroSection } from "@/components/hero";
import { FeatureSection } from "@/components/feature-section";
import { Integrations } from "@/components/integrations";
import { FaqsSection } from "@/components/faqs-section";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { getAuthOptional } from "@/lib/auth";
import { isPublicSignupEnabled } from "@/lib/app-config";

export default async function Page() {
  await headers();
  const [session, publicSignupEnabled] = await Promise.all([
    getAuthOptional(),
    isPublicSignupEnabled(),
  ]);
  const isAuthenticated = Boolean(session?.user?.id);

  return (
    <main className="min-h-dvh overflow-x-hidden bg-background">
      <Header
        isAuthenticated={isAuthenticated}
        publicSignupEnabled={publicSignupEnabled}
      />
      <HeroSection
        isAuthenticated={isAuthenticated}
        publicSignupEnabled={publicSignupEnabled}
      />
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
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="rounded-md bg-foreground text-background">
              <Link href="/dashboard">Open dashboard</Link>
            </Button>
            {!isAuthenticated ? (
              <Button asChild variant="outline" size="lg" className="rounded-md">
                <Link href="/sign-in">Sign in</Link>
              </Button>
            ) : null}
            {!isAuthenticated && publicSignupEnabled ? (
              <Button asChild variant="outline" size="lg" className="rounded-md">
                <Link href="/sign-up">Sign up</Link>
              </Button>
            ) : null}
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
