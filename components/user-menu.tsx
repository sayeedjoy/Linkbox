"use client";

import { useSession, signOut } from "next-auth/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { KeyIcon, SettingsIcon, LogOutIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { SettingsModal } from "@/components/settings-modal";

export function UserMenu() {
  const { data: session, status } = useSession();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const openSettings = useCallback(() => setSettingsOpen(true), []);

  if (status !== "authenticated" || !session?.user) return null;

  const user = session.user;
  const initial = user.name?.slice(0, 1).toUpperCase() ?? user.email?.slice(0, 1).toUpperCase() ?? "?";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full">
            {user.image ? (
              <img
                src={user.image}
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
          <DropdownMenuItem onClick={openSettings}>
            <KeyIcon className="size-4" />
            Generate API Token
          </DropdownMenuItem>
          <DropdownMenuItem onClick={openSettings}>
            <SettingsIcon className="size-4" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => signOut()}
          >
            <LogOutIcon className="size-4" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}
