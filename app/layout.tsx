import type { Metadata } from "next";
import { Suspense } from "react";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { GeistPixelSquare, GeistPixelGrid, GeistPixelCircle } from "geist/font/pixel";
import { siteMetadata } from "@/lib/metadata";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { NextAuthSessionProvider } from "@/components/session-provider";
import { Providers } from "@/app/providers";
import { Toaster } from "sonner";

export const metadata: Metadata = siteMetadata;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable} ${GeistPixelSquare.variable} ${GeistPixelGrid.variable} ${GeistPixelCircle.variable}`}>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          storageKey="bookmark-theme"
        >
          <NextAuthSessionProvider>
            <Providers>
              <Suspense fallback={null}>
                {children}
              </Suspense>
              <Toaster richColors position="bottom-right" />
            </Providers>
          </NextAuthSessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
