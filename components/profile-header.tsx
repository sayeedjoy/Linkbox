"use client";

import { GroupDropdown } from "@/components/group-dropdown";
import { UserMenu } from "@/components/user-menu";
import { cn } from "@/lib/utils";
import type { GroupWithCount } from "@/lib/types";

type ProfileHeaderProps = {
  groups: GroupWithCount[];
  totalBookmarkCount: number;
  selectedGroupId: string | null;
  onSelectGroupId: (id: string | null) => void;
  onGroupsChange: () => void;
  className?: string;
};

export function ProfileHeader({
  groups,
  totalBookmarkCount,
  selectedGroupId,
  onSelectGroupId,
  onGroupsChange,
  className,
}: ProfileHeaderProps) {
  return (
    <header className={cn(className)}>
      <div className="flex items-center justify-between gap-2 sm:gap-4 px-4 py-3 sm:px-6 sm:py-4 max-w-4xl w-full mx-auto">
        <GroupDropdown
          groups={groups}
          totalBookmarkCount={totalBookmarkCount}
          selectedGroupId={selectedGroupId}
          onSelectGroupId={onSelectGroupId}
          onGroupsChange={onGroupsChange}
        />
        <UserMenu />
      </div>
    </header>
  );
}
