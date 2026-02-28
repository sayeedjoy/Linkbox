import type { Metadata } from "next";

export const SITE_TITLE = "LinkArena";
export const SITE_DESCRIPTION = "simple, fast, and minimal bookmark manager.";

export const siteMetadata: Metadata = {
  title: { default: SITE_TITLE, template: `%s | ${SITE_TITLE}` },
  description: SITE_DESCRIPTION,
  icons: { icon: "/favicon.ico" },
};
