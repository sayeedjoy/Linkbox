import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { getGroups } from "@/app/actions/groups";
import { getBookmarks, getTotalBookmarkCount } from "@/app/actions/bookmarks";
import { getAuthOptional } from "@/lib/auth";
import { groupsKey, bookmarksKey, bookmarkCountKey } from "@/lib/query-keys";
import { BookmarkApp } from "@/components/bookmark-app";

type DashboardHomeProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function DashboardHome({ searchParams }: DashboardHomeProps) {
  const params = await searchParams;
  const groupParam = params?.group;
  const groupId =
    typeof groupParam === "string"
      ? groupParam
      : Array.isArray(groupParam)
        ? groupParam[0]
        : null;

  const session = await getAuthOptional();
  if (!session?.user?.id) {
    return (
      <BookmarkApp
        initialBookmarks={[]}
        initialGroups={[]}
        initialSelectedGroupId={groupId}
        initialTotalBookmarkCount={0}
      />
    );
  }

  const userId = session.user.id;
  const sort: "createdAt" | "title" = "createdAt";
  const order: "asc" | "desc" = "desc";
  const queryClient = new QueryClient();

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: groupsKey(userId),
      queryFn: () => getGroups(),
    }),
    queryClient.prefetchQuery({
      queryKey: bookmarksKey(userId, groupId ?? null, sort, order),
      queryFn: () =>
        getBookmarks({
          groupId: groupId ?? null,
          sort,
          order,
        }),
    }),
    queryClient.prefetchQuery({
      queryKey: bookmarkCountKey(userId),
      queryFn: () => getTotalBookmarkCount(),
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <BookmarkApp
        initialBookmarks={[]}
        initialGroups={[]}
        initialSelectedGroupId={groupId}
        initialTotalBookmarkCount={0}
      />
    </HydrationBoundary>
  );
}
