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

function firstParam(value: string | string[] | undefined): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value.length > 0) return value[0] ?? null;
  return null;
}

export async function DashboardHome({ searchParams }: DashboardHomeProps) {
  const params = await searchParams;
  const groupId = firstParam(params?.group);
  const sort: "createdAt" = "createdAt";
  const order: "desc" = "desc";

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

  const initialGroups = queryClient.getQueryData<Awaited<ReturnType<typeof getGroups>>>(groupsKey(userId)) ?? [];
  const initialBookmarks = queryClient.getQueryData<Awaited<ReturnType<typeof getBookmarks>>>(bookmarksKey(userId, groupId ?? null, sort, order)) ?? [];
  const initialTotalBookmarkCount = queryClient.getQueryData<number>(bookmarkCountKey(userId)) ?? 0;

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <BookmarkApp
        initialBookmarks={initialBookmarks}
        initialGroups={initialGroups}
        initialSelectedGroupId={groupId}
        initialTotalBookmarkCount={initialTotalBookmarkCount}
      />
    </HydrationBoundary>
  );
}
