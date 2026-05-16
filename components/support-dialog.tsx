"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { CheckIcon, CopyIcon, MailIcon, SendIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { getWebDashboardEntitlements } from "@/app/actions/settings";

const SUPPORT_EMAIL = "hello@sayeedjoy.com";

type SupportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function getBrowserInfo() {
  if (typeof window === "undefined") {
    return { userAgent: "", language: "", screen: "", timezone: "", url: "" };
  }
  return {
    userAgent: window.navigator.userAgent,
    language: window.navigator.language,
    screen: `${window.screen.width}x${window.screen.height} @ ${window.devicePixelRatio}x`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    url: window.location.href,
  };
}

export function SupportDialog({ open, onOpenChange }: SupportDialogProps) {
  const { data: session } = useSession();
  const [planLabel, setPlanLabel] = useState<string>("Unknown");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCopied(false);
    getWebDashboardEntitlements()
      .then((e) => {
        setPlanLabel(e.displayName ?? e.slug ?? "Unknown");
      })
      .catch(() => setPlanLabel("Unknown"));
  }, [open]);

  const debugInfo = useMemo(() => {
    const user = session?.user;
    const browser = getBrowserInfo();
    return [
      "--- LinkArena Support Info ---",
      `Name: ${user?.name ?? "-"}`,
      `Email: ${user?.email ?? "-"}`,
      `User ID: ${user?.id ?? "-"}`,
      `Plan: ${planLabel}`,
      `Page: ${browser.url}`,
      `Timezone: ${browser.timezone}`,
      `Language: ${browser.language}`,
      `Screen: ${browser.screen}`,
      `User Agent: ${browser.userAgent}`,
      `Reported: ${new Date().toISOString()}`,
      "------------------------------",
    ].join("\n");
  }, [session, planLabel]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(debugInfo);
      setCopied(true);
      toast.success("Debug info copied to clipboard");
    } catch {
      toast.error("Couldn't access clipboard. Please copy manually.");
    }
  }

  function handleSend() {
    const subject = encodeURIComponent("LinkArena Support Request");
    const body = encodeURIComponent(
      `${message.trim() ? message.trim() + "\n\n" : ""}${debugInfo}\n`
    );
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="px-4 pb-4 pt-5 sm:px-6">
          <DialogTitle className="flex items-center gap-2">
            <MailIcon className="size-4 text-muted-foreground" />
            Contact Support
          </DialogTitle>
          <DialogDescription>
            Reach us at{" "}
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="text-primary underline-offset-4 hover:underline"
            >
              {SUPPORT_EMAIL}
            </a>
            . Copy the debug info first — Send unlocks once it&apos;s on your
            clipboard.
          </DialogDescription>
        </DialogHeader>

        <Separator />

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          <FieldGroup>
            <Field>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <FieldLabel htmlFor="support-debug">Debug info</FieldLabel>
                <Button
                  type="button"
                  size="sm"
                  variant={copied ? "secondary" : "outline"}
                  onClick={handleCopy}
                >
                  {copied ? (
                    <>
                      <CheckIcon data-icon="inline-start" />
                      Copied
                    </>
                  ) : (
                    <>
                      <CopyIcon data-icon="inline-start" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <pre
                id="support-debug"
                className="max-h-48 overflow-auto rounded-md border bg-muted/40 p-3 text-xs leading-relaxed text-foreground/90 whitespace-pre-wrap break-all sm:max-h-56"
                aria-label="Account and environment debug info"
              >
                {debugInfo}
              </pre>
              <FieldDescription>
                Identifies your account and environment. Nothing is sent until
                you click Send.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="support-message">
                What&apos;s going on? (optional)
              </FieldLabel>
              <Textarea
                id="support-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe the issue, steps to reproduce, what you expected..."
                rows={5}
                className="resize-none"
              />
            </Field>
          </FieldGroup>
        </div>

        <DialogFooter className="mx-0 mb-0 rounded-none sm:items-center">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSend}
            disabled={!copied}
            title={copied ? "Open your email client" : "Copy the debug info first"}
          >
            <SendIcon data-icon="inline-start" />
            Send via email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
