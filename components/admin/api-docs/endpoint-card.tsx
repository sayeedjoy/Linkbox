"use client";

import { useState } from "react";
import { ChevronDownIcon, LockIcon, GlobeIcon, CopyIcon, CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Method = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

const METHOD_STYLES: Record<Method, string> = {
  GET: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20",
  POST: "bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-blue-500/20",
  PUT: "bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-amber-500/20",
  DELETE: "bg-red-500/10 text-red-600 dark:text-red-400 ring-red-500/20",
  PATCH: "bg-purple-500/10 text-purple-600 dark:text-purple-400 ring-purple-500/20",
};

function MethodBadge({ method }: { method: Method }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold ring-1",
        METHOD_STYLES[method]
      )}
    >
      {method}
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        void navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="rounded p-1 text-muted-foreground/50 transition-colors hover:bg-muted hover:text-muted-foreground"
      aria-label="Copy"
    >
      {copied ? <CheckIcon className="size-3.5 text-emerald-500" /> : <CopyIcon className="size-3.5" />}
    </button>
  );
}

function CodeBlock({ code, label }: { code: string; label?: string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-muted/40">
      {label && (
        <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
          <CopyButton text={code} />
        </div>
      )}
      <pre className="overflow-x-auto p-3 text-xs leading-relaxed text-foreground/90">
        <code>{code}</code>
      </pre>
    </div>
  );
}

type Param = {
  name: string;
  type: string;
  required?: boolean;
  description: string;
};

type EndpointCardProps = {
  method: Method;
  path: string;
  description: string;
  auth: "bearer" | "none";
  params?: Param[];
  queryParams?: Param[];
  requestBody?: string;
  responseBody?: string;
  notes?: string[];
  defaultOpen?: boolean;
};

export function EndpointCard({
  method,
  path,
  description,
  auth,
  params,
  queryParams,
  requestBody,
  responseBody,
  notes,
  defaultOpen = false,
}: EndpointCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  const baseUrl =
    typeof window === "undefined" ? "https://your-domain.com" : window.location.origin;
  const fullEndpoint = `${method} ${baseUrl}${path}`;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <button
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
        onClick={() => setOpen((v) => !v)}
      >
        <MethodBadge method={method} />
        <code className="flex-1 truncate font-mono text-sm text-foreground">{path}</code>
        {auth === "bearer" ? (
          <span className="hidden items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 sm:flex">
            <LockIcon className="size-3" /> Auth
          </span>
        ) : (
          <span className="hidden items-center gap-1 text-[11px] text-muted-foreground sm:flex">
            <GlobeIcon className="size-3" /> Public
          </span>
        )}
        <ChevronDownIcon
          className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="space-y-4 border-t border-border px-4 py-4">
          <p className="text-sm text-muted-foreground">{description}</p>
          <CodeBlock code={fullEndpoint} label="Full Endpoint" />

          {auth === "bearer" && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-400">
              <LockIcon className="size-3 shrink-0" />
              Requires <code className="font-mono font-semibold">Authorization: Bearer &lt;token&gt;</code> header
            </div>
          )}

          {notes && notes.length > 0 && (
            <ul className="space-y-1">
              {notes.map((n, i) => (
                <li key={i} className="flex gap-2 text-xs text-muted-foreground">
                  <span className="mt-0.5 shrink-0 text-muted-foreground/50">•</span>
                  <span>{n}</span>
                </li>
              ))}
            </ul>
          )}

          {queryParams && queryParams.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Query Parameters</p>
              <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                {queryParams.map((p) => (
                  <div key={p.name} className="flex flex-wrap items-start gap-x-3 gap-y-0.5 px-3 py-2">
                    <code className="font-mono text-xs font-semibold text-foreground">{p.name}</code>
                    <span className="rounded px-1 py-0.5 font-mono text-[10px] text-muted-foreground ring-1 ring-border">{p.type}</span>
                    {!p.required && <span className="text-[10px] text-muted-foreground/60">optional</span>}
                    <span className="w-full text-xs text-muted-foreground">{p.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {params && params.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Path Parameters</p>
              <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                {params.map((p) => (
                  <div key={p.name} className="flex flex-wrap items-start gap-x-3 gap-y-0.5 px-3 py-2">
                    <code className="font-mono text-xs font-semibold text-foreground">{p.name}</code>
                    <span className="rounded px-1 py-0.5 font-mono text-[10px] text-muted-foreground ring-1 ring-border">{p.type}</span>
                    <span className="w-full text-xs text-muted-foreground">{p.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {requestBody && (
            <CodeBlock code={requestBody} label="Request Body" />
          )}

          {responseBody && (
            <CodeBlock code={responseBody} label="Response" />
          )}
        </div>
      )}
    </div>
  );
}
