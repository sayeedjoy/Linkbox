import type { Metadata } from "next";

export const SITE_TITLE = "LinkBox";
export const SITE_DESCRIPTION = "simple, fast, and minimal bookmark manager.";

export const siteMetadata: Metadata = {
  title: { default: SITE_TITLE, template: `%s | ${SITE_TITLE}` },
  description: SITE_DESCRIPTION,
  icons: {
    icon: [
      { url: "/bookmark-liquid-glass-32.png", sizes: "32x32", type: "image/png" },
      { url: "/bookmark-liquid-glass-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/bookmark-liquid-glass-96.png",
  },
};
