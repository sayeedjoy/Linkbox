"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TrashIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { createApiToken, listApiTokens, revokeApiToken } from "@/app/actions/api-tokens";

function formatTokenDate(d: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  }).format(new Date(d));
}

export function GenerateApiTokenModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [apiTokens, setApiTokens] = useState<
    { id: string; name: string; createdAt: Date }[]
  >([]);
  const [newTokenName, setNewTokenName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const loadTokens = useCallback(() => {
    if (open) listApiTokens().then(setApiTokens);
  }, [open]);

  useEffect(() => {
    if (open) {
      loadTokens();
      setNewTokenName("");
    }
  }, [open, loadTokens]);

  const handleCreateToken = useCallback(async () => {
    const name = newTokenName.trim() || "Default";
    setIsCreating(true);
    try {
      const result = await createApiToken(name);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setNewTokenName("");
      loadTokens();
      await navigator.clipboard.writeText(result.token);
      toast.success("Token created. Copy it now; it won't be shown again.");
    } catch {
      toast.error("Failed to create token");
    } finally {
      setIsCreating(false);
    }
  }, [newTokenName, loadTokens]);

  const handleRevoke = useCallback(
    async (id: string) => {
      try {
        const result = await revokeApiToken(id);
        if ("error" in result) {
          toast.error(result.error);
          return;
        }
        setApiTokens((prev) => prev.filter((t) => t.id !== id));
        toast.success("Token revoked");
      } catch {
        toast.error("Failed to revoke");
      }
    },
    []
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90dvh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Generate API Token</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Create an API token to use with the Chrome extension or other
            integrations. For security, tokens are only shown once.
          </p>
        </DialogHeader>
        <div className="overflow-y-auto min-h-0 flex-1 flex flex-col gap-4 py-2">
          <div className="rounded-xl border border-border bg-muted/20 p-4 flex flex-col gap-3">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Your API Tokens
            </span>
            {apiTokens.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No tokens yet. Create one below.
              </p>
            ) : (
              <ul className="space-y-2">
                {apiTokens.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2.5 min-h-10"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-medium block truncate text-sm">{t.name}</span>
                      <span className="text-xs text-muted-foreground">
                        Created {formatTokenDate(t.createdAt)}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRevoke(t.id)}
                      aria-label="Revoke token"
                    >
                      <TrashIcon className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-xl border border-border bg-muted/20 p-4 flex flex-col gap-3">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Create New Token
            </span>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="e.g., Chrome Extension"
                value={newTokenName}
                onChange={(e) => setNewTokenName(e.target.value)}
                className="h-8 flex-1 min-w-0"
              />
              <Button
                onClick={handleCreateToken}
                disabled={isCreating}
                className="h-8 shrink-0"
              >
                {isCreating ? "Creating…" : "Create Token"}
              </Button>
            </div>
          </div>
        </div>
        <div className="flex justify-end pt-4 -mx-4 -mb-4 px-4 pb-4 border-t border-border">
          <Button variant="outline" size="default" className="h-8" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
