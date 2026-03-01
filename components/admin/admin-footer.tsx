"use client";

import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";

export function AdminFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
        <p className="text-xs text-muted-foreground">
          LinkArena Admin
        </p>
        <AnimatedThemeToggler className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground [&_svg]:size-4" />
      </div>
    </footer>
  );
}
