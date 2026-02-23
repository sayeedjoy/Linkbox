import { getBookmarks, getTotalBookmarkCount } from "@/app/actions/bookmarks";
import { getGroups } from "@/app/actions/groups";
import { BookmarkApp } from "@/components/bookmark-app";
import { Suspense } from "react";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const groupParam = params?.group;
  const groupId =
    typeof groupParam === "string"
      ? groupParam
      : Array.isArray(groupParam)
        ? groupParam[0]
        : null;

  const [initialGroups, initialBookmarks, initialTotalCount] = await Promise.all([
    getGroups(),
    getBookmarks({
      groupId: groupId ?? undefined,
      sort: "createdAt",
      order: "desc",
    }),
    getTotalBookmarkCount(),
  ]);

  const validGroupId =
    groupId && initialGroups.some((g) => g.id === groupId) ? groupId : null;

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          Loading…
        </div>
      }
    >
      <BookmarkApp
        initialBookmarks={initialBookmarks}
        initialGroups={initialGroups}
        initialSelectedGroupId={validGroupId}
        initialTotalBookmarkCount={initialTotalCount}
      />
    </Suspense>
  );
}
