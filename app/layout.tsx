import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import { siteMetadata } from "@/lib/metadata";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { NextAuthSessionProvider } from "@/components/session-provider";
import { Providers } from "@/app/providers";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = siteMetadata;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body
        className={`${inter.variable} ${geistMono.variable} antialiased`}
      >
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
