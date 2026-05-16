import type { Metadata } from "next";
import { Header } from "@/components/header";
import Footer from "@/components/footer";

export const metadata: Metadata = {
  title: "Privacy Policy — LinkArena",
  description:
    "Learn how LinkArena collects, uses, and protects your personal information when you use our bookmarking platform and browser extension.",
};

const lastUpdated = "May 16, 2026";

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-dvh overflow-x-hidden bg-background">
      <Header />
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-3xl px-6">
          <header className="mb-10 border-b pb-8">
            <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
              Privacy Policy
            </h1>
            <p className="text-muted-foreground mt-3 text-sm">
              Last updated: {lastUpdated}
            </p>
          </header>

          <div className="prose prose-neutral dark:prose-invert max-w-none space-y-10 text-[15px] leading-relaxed">
            <section className="space-y-3">
              <p className="text-muted-foreground">
                This Privacy Policy describes how LinkArena (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;)
                collects, uses, and protects information when you use our web
                application and Chrome extension (collectively, the &quot;Service&quot;).
                By using LinkArena, you agree to the practices described below.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold tracking-tight">
                1. Information We Collect
              </h2>
              <p>We collect the following categories of information:</p>
              <ul className="list-disc space-y-2 pl-6">
                <li>
                  <strong>Account information:</strong> your email address,
                  hashed password, and account preferences.
                </li>
                <li>
                  <strong>Bookmark content:</strong> URLs, titles, descriptions,
                  tags, groups, and any metadata you save to your library.
                </li>
                <li>
                  <strong>Browser bookmarks (optional):</strong> if you enable
                  the browser import feature, we receive bookmarks you choose
                  to sync from your browser.
                </li>
                <li>
                  <strong>Authentication tokens:</strong> session cookies and
                  API tokens used by the Chrome extension.
                </li>
                <li>
                  <strong>Usage data:</strong> basic logs needed to operate the
                  Service, such as request timestamps and error reports.
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold tracking-tight">
                2. How We Use Your Information
              </h2>
              <ul className="list-disc space-y-2 pl-6">
                <li>To provide, maintain, and improve the Service.</li>
                <li>To authenticate you and keep your account secure.</li>
                <li>
                  To sync bookmarks across the web app and browser extension.
                </li>
                <li>
                  To power optional AI auto-grouping when you enable it in
                  settings.
                </li>
                <li>
                  To send transactional emails (password resets, account
                  notices).
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold tracking-tight">
                3. AI Processing
              </h2>
              <p>
                If you enable auto-grouping, bookmark titles and URLs are sent
                to our AI provider (OpenRouter) solely to classify them into
                groups. We do not use your content to train third-party models.
                You can disable this feature at any time in settings.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold tracking-tight">
                4. Chrome Extension
              </h2>
              <p>
                The LinkArena Chrome extension stores your API token locally
                and communicates only with our servers. The optional{" "}
                <code>bookmarks</code> permission is used exclusively to import
                or sync bookmarks you explicitly choose to save. We never read,
                upload, or analyze browsing history.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold tracking-tight">
                5. Sharing of Information
              </h2>
              <p>
                We do not sell your personal information. We share data only
                with service providers required to operate the Service —
                including our database host, email delivery (Resend), and AI
                provider (OpenRouter) — and only to the extent necessary to
                deliver the feature you used.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold tracking-tight">
                6. Data Retention
              </h2>
              <p>
                We retain your account and bookmark data for as long as your
                account is active. You may delete your account at any time from
                settings; once deleted, your bookmarks and associated metadata
                are permanently removed from our active systems.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold tracking-tight">
                7. Security
              </h2>
              <p>
                Passwords are hashed, API tokens are stored hashed with only a
                short prefix/suffix kept for display, and all traffic is served
                over HTTPS. No system is perfectly secure, but we work to
                protect your data using industry-standard practices.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold tracking-tight">
                8. Your Rights
              </h2>
              <p>
                You may access, export, correct, or delete your information at
                any time from your account settings. For requests we cannot
                fulfill in-product, contact us at the address below.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold tracking-tight">
                9. Children&apos;s Privacy
              </h2>
              <p>
                LinkArena is not intended for children under 13. We do not
                knowingly collect personal information from children.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold tracking-tight">
                10. Changes to This Policy
              </h2>
              <p>
                We may update this Privacy Policy from time to time. Material
                changes will be highlighted in-product or via email. Continued
                use of the Service after an update constitutes acceptance.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold tracking-tight">
                11. Contact Us
              </h2>
              <p>
                Questions about this Privacy Policy? Email us at{" "}
                <a
                  href="mailto:hello@sayeedjoy.com"
                  className="text-primary underline-offset-4 hover:underline"
                >
                  hello@sayeedjoy.com
                </a>
                .
              </p>
            </section>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
