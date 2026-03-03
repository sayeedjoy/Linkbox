import type { Metadata } from "next";

export const SITE_TITLE = "LinkArena";
export const SITE_DESCRIPTION =
  "Simple, fast, and minimal bookmark manager. Save, organize, and sync your bookmarks across devices with AI-powered auto-grouping.";
export const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://linkarena.app";

export const siteMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_TITLE, template: `%s | ${SITE_TITLE}` },
  description: SITE_DESCRIPTION,
  icons: { icon: "/favicon.ico" },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: SITE_TITLE,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: "/",
    images: [
      {
        url: "/og.webp",
        width: 1200,
        height: 630,
        alt: SITE_TITLE,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/og.webp"],
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "/",
  },
};
