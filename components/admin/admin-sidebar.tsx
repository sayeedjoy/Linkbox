"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboardIcon,
  UsersIcon,
  Settings2Icon,
  ActivityIcon,
  SmartphoneIcon,
  ArrowLeftIcon,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";

const NAV = [
  {
    group: "Dashboard",
    items: [
      { label: "Overview", href: "/admin", icon: LayoutDashboardIcon, exact: true },
    ],
  },
  {
    group: "Management",
    items: [
      { label: "Users", href: "/admin/users", icon: UsersIcon, exact: false },
      { label: "Ads (AdMob)", href: "/admin/ads", icon: SmartphoneIcon, exact: false },
    ],
  },
  {
    group: "System",
    items: [
      { label: "Settings", href: "/admin/settings", icon: Settings2Icon, exact: false },
      { label: "System Health", href: "/admin/system", icon: ActivityIcon, exact: false },
    ],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();

  function isActive(href: string, exact: boolean) {
    return exact ? pathname === href : pathname.startsWith(href);
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-14 flex-row items-center gap-2 border-b border-sidebar-border px-3 py-0">
        <Link
          href="/dashboard"
          className="flex size-7 shrink-0 items-center justify-center rounded-md border border-sidebar-border text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:mx-auto"
          aria-label="Back to dashboard"
        >
          <ArrowLeftIcon className="size-3.5" />
        </Link>
        <span className="truncate text-sm font-semibold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
          Admin Console
        </span>
      </SidebarHeader>

      <SidebarContent>
        {NAV.map((section) => (
          <SidebarGroup key={section.group}>
            <SidebarGroupLabel>{section.group}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.href, item.exact)}
                      tooltip={item.label}
                    >
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarSeparator />
      <SidebarFooter>
        <div className="flex items-center justify-between px-2 py-1 group-data-[collapsible=icon]:justify-center">
          <p className="truncate text-xs text-sidebar-foreground/50 group-data-[collapsible=icon]:hidden">
            LinkArena Admin
          </p>
          <AnimatedThemeToggler className="rounded-md p-1.5 text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground [&_svg]:size-4" />
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
