"use client";

import dynamic from "next/dynamic";
import { useSession, signOut } from "next-auth/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Key, Settings, LogOut } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const SettingsModal = dynamic(
  () => import("@/components/settings-modal").then((m) => ({ default: m.SettingsModal })),
  { ssr: false, loading: () => null }
);

const GenerateApiTokenModal = dynamic(
  () => import("@/components/generate-api-token-modal").then((m) => ({ default: m.GenerateApiTokenModal })),
  { ssr: false, loading: () => null }
);

export function UserMenu() {
  const { data: session, status } = useSession();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [apiTokenModalOpen, setApiTokenModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const openSettings = useCallback(() => setSettingsOpen(true), []);
  const openApiTokenModal = useCallback(() => setApiTokenModalOpen(true), []);

  useEffect(() => {
    if (menuOpen) {
      import("@/components/settings-modal");
      import("@/components/generate-api-token-modal");
    }
  }, [menuOpen]);

  if (status !== "authenticated" || !session?.user) return null;

  const user = session.user;
  const initial = user.name?.slice(0, 1).toUpperCase() ?? user.email?.slice(0, 1).toUpperCase() ?? "?";
  const avatarId = encodeURIComponent(user.email ?? user.name ?? "user");

  return (
    <>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full">
            {(user.image || avatarId) ? (
              <img
                src={user.image ?? `https://avatar.vercel.sh/${avatarId}?size=32`}
                alt=""
                className="size-8 rounded-full object-cover"
              />
            ) : (
              <span className="flex size-8 items-center justify-center rounded-full bg-muted text-sm font-medium">
                {initial}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[180px]">
          <DropdownMenuItem onClick={openApiTokenModal}>
            <Key className="size-4" />
            Generate API Token
          </DropdownMenuItem>
          <DropdownMenuItem onClick={openSettings}>
            <Settings className="size-4" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={async () => {
              await signOut({ redirect: false });
              window.location.href = "/sign-in";
            }}
          >
            <LogOut className="size-4" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
      <GenerateApiTokenModal
        open={apiTokenModalOpen}
        onOpenChange={setApiTokenModalOpen}
      />
    </>
  );
}
