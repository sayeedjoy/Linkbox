/**
 * Markdown representations of the public, canonical content pages.
 *
 * Powers two agent-readiness affordances (AIScan check C1, "Markdown content
 * negotiation"):
 *   1. Static `.md` mirrors exposed at `/index.md`, `/privacy/index.md`,
 *      `/support/index.md` via route handlers.
 *   2. Content negotiation in `proxy.ts`: a request to the canonical HTML URL
 *      with `Accept: text/markdown` (or `?format=md`) is rewritten to the
 *      matching `.md` route.
 *
 * Keep this in sync with the corresponding `app/**\/page.tsx` content.
 * This module is edge-safe (plain strings only) so `proxy.ts` can import it.
 */

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://linkarena.app";

const HOME_MARKDOWN = `# LinkArena — Bookmarking Like Never Before

> Save links instantly. Organize automatically. Find anything in seconds.

LinkArena is a fast, full-stack bookmark manager with a web app and a Chrome
extension. Save any page in one click, let AI sort it into the right group, and
find it again in seconds — synced across every device in real time.

## Core features

- **Save in a click** — Drop a link or note. We fill in the rest.
- **AI auto-sorting** — New saves land in the right group on their own.
- **Groups you can shape** — Make groups, pick colours, drag to reorder.
- **Find anything fast** — Search or scroll the timeline to find a link.
- **Always in sync** — Save once, see it on every device instantly.
- **Browser extension** — Save the page you're on in a single click.
- **Bring your bookmarks** — Import your browser bookmarks in seconds.
- **On your phone too** — Your library, ready in your pocket.
- **Private and secure** — Your links stay yours. Always.

## Frequently asked questions

### What is LinkArena?
A simple, fast bookmark manager that helps you save, organize, and find your
favorite links from anywhere.

### How do I save a bookmark?
Install our Chrome extension to save any page in one click, or paste a link
directly into the web app. It only takes a second.

### Will my bookmarks stay in sync across devices?
Yes. Anything you save shows up instantly on all your devices and browser tabs,
so you never have to refresh or wait.

### Can I organize my bookmarks?
Absolutely. Sort your links into groups, give them colors, drag to reorder, and
search or filter to find anything in seconds.

### Which browsers does LinkArena work with?
You can use the web app in any modern browser. Our extension works in Chrome and
other Chromium-based browsers like Edge, Brave, and Arc.

### Is my data safe?
Yes. Your bookmarks are private to your account, and you can export everything
anytime you want a backup.

### How do I get started?
Just sign up for a free account, install the Chrome extension, and start saving.

### How do I get help?
Email us anytime at hello@sayeedjoy.com — or open the Support dialog from your
dashboard profile menu to send a pre-filled bug report.

## Links

- Dashboard: ${SITE_URL}/dashboard
- Pricing: ${SITE_URL}/#pricing
- Privacy policy: ${SITE_URL}/privacy
- Support: ${SITE_URL}/support
`;

const PRIVACY_MARKDOWN = `# Privacy Policy

_Last updated: May 16, 2026_

This Privacy Policy describes how LinkArena ("we", "us", or "our") collects,
uses, and protects information when you use our web application and Chrome
extension (collectively, the "Service"). By using LinkArena, you agree to the
practices described below.

## 1. Information We Collect

- **Account information:** your email address, hashed password, and account preferences.
- **Bookmark content:** URLs, titles, descriptions, tags, groups, and any metadata you save to your library.
- **Browser bookmarks (optional):** if you enable the browser import feature, we receive bookmarks you choose to sync from your browser.
- **Authentication tokens:** session cookies and API tokens used by the Chrome extension.
- **Usage data:** basic logs needed to operate the Service, such as request timestamps and error reports.

## 2. How We Use Your Information

- To provide, maintain, and improve the Service.
- To authenticate you and keep your account secure.
- To sync bookmarks across the web app and browser extension.
- To power optional AI auto-grouping when you enable it in settings.
- To send transactional emails (password resets, account notices).

## 3. AI Processing

If you enable auto-grouping, bookmark titles and URLs are sent to our AI provider
(OpenRouter) solely to classify them into groups. We do not use your content to
train third-party models. You can disable this feature at any time in settings.

## 4. Chrome Extension

The LinkArena Chrome extension stores your API token locally and communicates
only with our servers. The optional \`bookmarks\` permission is used exclusively
to import or sync bookmarks you explicitly choose to save. We never read, upload,
or analyze browsing history.

## 5. Sharing of Information

We do not sell your personal information. We share data only with service
providers required to operate the Service — including our database host, email
delivery (Resend), and AI provider (OpenRouter) — and only to the extent
necessary to deliver the feature you used.

## 6. Data Retention

We retain your account and bookmark data for as long as your account is active.
You may delete your account at any time from settings; once deleted, your
bookmarks and associated metadata are permanently removed from our active systems.

## 7. Security

Passwords are hashed, API tokens are stored hashed with only a short
prefix/suffix kept for display, and all traffic is served over HTTPS. No system
is perfectly secure, but we work to protect your data using industry-standard
practices.

## 8. Your Rights

You may access, export, correct, or delete your information at any time from your
account settings. For requests we cannot fulfill in-product, contact us at the
address below.

## 9. Children's Privacy

LinkArena is not intended for children under 13. We do not knowingly collect
personal information from children.

## 10. Changes to This Policy

We may update this Privacy Policy from time to time. Material changes will be
highlighted in-product or via email. Continued use of the Service after an update
constitutes acceptance.

## 11. Contact Us

Questions about this Privacy Policy? Email us at hello@sayeedjoy.com.
`;

const SUPPORT_MARKDOWN = `# Support

Need help with LinkArena? We're here for you. Reach out with questions, bug
reports, or feedback.

## Email us

We typically respond within 1–2 business days: hello@sayeedjoy.com

## In-app support

Signed in? Open the profile menu in the dashboard and click "Support" — your
account info is prefilled to speed up debugging.

## Before you write

A quick checklist that often resolves the most common issues:

- Make sure you're signed in to the correct account.
- For extension issues, verify your API token is valid in Settings → API Tokens.
- Reload the page or restart the extension to clear stuck state.
- Check your browser console for errors and include them in your message.

## What to include

The more context you share, the faster we can help. When you contact us, please
include:

- Your account email
- What you were trying to do
- What actually happened (with screenshots if possible)
- Browser and operating system

Tip: the in-app Support dialog collects all of this automatically.

For everything else, email hello@sayeedjoy.com.
`;

type MarkdownPage = {
  /** Canonical HTML route for the content. */
  canonicalPath: string;
  /** `.md` mirror route handler that serves the markdown. */
  mdPath: string;
  markdown: string;
};

const PAGES: MarkdownPage[] = [
  { canonicalPath: "/", mdPath: "/index.md", markdown: HOME_MARKDOWN },
  { canonicalPath: "/privacy", mdPath: "/privacy/index.md", markdown: PRIVACY_MARKDOWN },
  { canonicalPath: "/support", mdPath: "/support/index.md", markdown: SUPPORT_MARKDOWN },
];

const BY_CANONICAL = new Map(PAGES.map((page) => [page.canonicalPath, page]));

/** Strip a single trailing slash so `/privacy/` matches `/privacy`. */
function normalizePath(pathname: string): string {
  return pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

/** Whether `pathname` is a canonical content URL that has a markdown variant. */
export function isMarkdownContentPath(pathname: string): boolean {
  return BY_CANONICAL.has(normalizePath(pathname));
}

/** The `.md` mirror route for a canonical content URL, or null. */
export function markdownPathFor(pathname: string): string | null {
  return BY_CANONICAL.get(normalizePath(pathname))?.mdPath ?? null;
}

/** Build a `text/markdown` response for a canonical content path. */
export function markdownResponse(canonicalPath: string): Response {
  const page = BY_CANONICAL.get(normalizePath(canonicalPath));
  if (!page) return new Response("Not found", { status: 404 });
  return new Response(page.markdown, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      // The canonical URL can return HTML or Markdown depending on Accept.
      Vary: "Accept",
      "Cache-Control": "public, max-age=3600, must-revalidate",
    },
  });
}
