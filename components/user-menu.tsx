"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
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

function TimelineIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" className={className}>
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
        <path d="m4 16l6-7l5 5l5-6" />
        <path d="M14 14a1 1 0 1 0 2 0a1 1 0 1 0-2 0M9 9a1 1 0 1 0 2 0a1 1 0 1 0-2 0m-6 7a1 1 0 1 0 2 0a1 1 0 1 0-2 0m16-8a1 1 0 1 0 2 0a1 1 0 1 0-2 0" />
      </g>
    </svg>
  );
}

function DashboardIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" className={className}>
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
        <path d="M10 13a2 2 0 1 0 4 0a2 2 0 1 0-4 0m3.45-1.45L15.5 9.5" />
        <path d="M6.4 20a9 9 0 1 1 11.2 0z" />
      </g>
    </svg>
  );
}

const SettingsModal = dynamic(
  () => import("@/components/settings-modal").then((m) => ({ default: m.SettingsModal })),
  { ssr: false, loading: () => null }
);

const GenerateApiTokenModal = dynamic(
  () => import("@/components/generate-api-token-modal").then((m) => ({ default: m.GenerateApiTokenModal })),
  { ssr: false, loading: () => null }
);

export function UserMenu() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [apiTokenModalOpen, setApiTokenModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const openSettings = useCallback(() => setSettingsOpen(true), []);
  const openApiTokenModal = useCallback(() => setApiTokenModalOpen(true), []);
  const isDashboard = pathname === "/dashboard" || pathname?.startsWith("/dashboard/");
  const isTimeline = pathname === "/timeline" || pathname?.startsWith("/timeline/");

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
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen} modal={false}>
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
          {isDashboard && (
            <DropdownMenuItem asChild>
              <Link href="/timeline">
                <TimelineIcon className="size-4" />
                Timeline
              </Link>
            </DropdownMenuItem>
          )}
          {isTimeline && (
            <DropdownMenuItem asChild>
              <Link href="/dashboard">
                <DashboardIcon className="size-4" />
                Dashboard
              </Link>
            </DropdownMenuItem>
          )}
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
