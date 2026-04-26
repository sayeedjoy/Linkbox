"use client";

import { useState } from "react";
import { CopyIcon, CheckIcon } from "lucide-react";

export function BaseUrlBanner() {
  const baseUrl =
    typeof window === "undefined" ? "https://your-domain.com" : window.location.origin;
  const [copied, setCopied] = useState(false);

  function copy() {
    void navigator.clipboard.writeText(baseUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3">
      <div className="space-y-0.5">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Base URL
        </p>
        <code suppressHydrationWarning className="font-mono text-sm font-semibold text-foreground">
          {baseUrl}
        </code>
      </div>
      <div className="flex items-center gap-3">
        <p className="text-xs text-muted-foreground">
          All paths below are relative to this base URL.
        </p>
        <button
          onClick={copy}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {copied ? (
            <CheckIcon className="size-3.5 text-emerald-500" />
          ) : (
            <CopyIcon className="size-3.5" />
          )}
          Copy
        </button>
      </div>
    </div>
  );
}
