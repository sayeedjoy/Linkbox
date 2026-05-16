import type { Metadata } from "next";
import Link from "next/link";
import { MailIcon, MessageCircleQuestionIcon, BookOpenIcon } from "lucide-react";
import { Header } from "@/components/header";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Support — LinkArena",
  description:
    "Get help with LinkArena. Contact support, report bugs, or share feedback.",
};

const SUPPORT_EMAIL = "hello@sayeedjoy.com";

export default function SupportPage() {
  return (
    <main className="min-h-dvh overflow-x-hidden bg-background">
      <Header />
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-3xl px-6">
          <header className="mb-10 pb-8 text-center">
            <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
              Support
            </h1>
            <p className="text-muted-foreground mx-auto mt-3 max-w-xl text-base">
              Need help with LinkArena? We&apos;re here for you. Reach out with
              questions, bug reports, or feedback.
            </p>
          </header>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-3 rounded-xl border bg-card p-6">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <MailIcon className="size-5" />
              </div>
              <div>
                <h2 className="font-semibold">Email us</h2>
                <p className="text-muted-foreground text-sm">
                  We typically respond within 1–2 business days.
                </p>
              </div>
              <Button asChild variant="outline" className="mt-auto w-fit">
                <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
              </Button>
            </div>

            <div className="flex flex-col gap-3 rounded-xl border bg-card p-6">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <MessageCircleQuestionIcon className="size-5" />
              </div>
              <div>
                <h2 className="font-semibold">In-app support</h2>
                <p className="text-muted-foreground text-sm">
                  Signed in? Open the profile menu in the dashboard and click
                  &ldquo;Support&rdquo; — your account info is prefilled to
                  speed up debugging.
                </p>
              </div>
              <Button asChild variant="outline" className="mt-auto w-fit">
                <Link href="/dashboard">Open dashboard</Link>
              </Button>
            </div>
          </div>

          <div className="mt-10 space-y-6">
            <section className="space-y-2">
              <div className="flex items-center gap-2">
                <BookOpenIcon className="text-muted-foreground size-4" />
                <h2 className="text-xl font-semibold tracking-tight">
                  Before you write
                </h2>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed">
                A quick checklist that often resolves the most common issues:
              </p>
              <ul className="text-muted-foreground list-disc space-y-1 pl-6 text-sm leading-relaxed">
                <li>Make sure you&apos;re signed in to the correct account.</li>
                <li>
                  For extension issues, verify your API token is valid in
                  Settings → API Tokens.
                </li>
                <li>
                  Reload the page or restart the extension to clear stuck
                  state.
                </li>
                <li>
                  Check your browser console for errors and include them in
                  your message.
                </li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-xl font-semibold tracking-tight">
                What to include
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                The more context you share, the faster we can help. When you
                contact us, please include:
              </p>
              <ul className="text-muted-foreground list-disc space-y-1 pl-6 text-sm leading-relaxed">
                <li>Your account email</li>
                <li>What you were trying to do</li>
                <li>What actually happened (with screenshots if possible)</li>
                <li>Browser and operating system</li>
              </ul>
              <p className="text-muted-foreground pt-2 text-sm">
                Tip: the in-app Support dialog collects all of this
                automatically.
              </p>
            </section>
          </div>

          <div className="bg-muted/40 mt-10 rounded-xl p-6 text-center">
            <p className="text-sm">
              For everything else, email{" "}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="text-primary font-medium underline-offset-4 hover:underline"
              >
                {SUPPORT_EMAIL}
              </a>
              .
            </p>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
