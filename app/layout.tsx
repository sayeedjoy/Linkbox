import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { ThemeInit } from "@/components/theme-init";
import { NextAuthSessionProvider } from "@/components/session-provider";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bookmarks",
  description: "Save and organize your bookmarks",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NextAuthSessionProvider>
          <ThemeInit />
          {children}
        </NextAuthSessionProvider>
      </body>
    </html>
  );
}
