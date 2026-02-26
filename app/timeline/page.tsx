import { redirect } from "next/navigation";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { getBookmarks } from "@/app/actions/bookmarks";
import { getGroups } from "@/app/actions/groups";
import { getAuthOptional } from "@/lib/auth";
import { timelineBookmarksKey, groupsKey } from "@/lib/query-keys";
import { TimelineShell } from "@/components/timeline";

export default async function TimelinePage() {
  const session = await getAuthOptional();
  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const userId = session.user.id;

  const queryClient = new QueryClient();

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: timelineBookmarksKey(userId),
      queryFn: () =>
        getBookmarks({ sort: "createdAt", order: "desc" }),
    }),
    queryClient.prefetchQuery({
      queryKey: groupsKey(userId),
      queryFn: () => getGroups(),
    }),
  ]);

  const initialBookmarks =
    queryClient.getQueryData<Awaited<ReturnType<typeof getBookmarks>>>(
      timelineBookmarksKey(userId)
    ) ?? [];
  const initialGroups =
    queryClient.getQueryData<Awaited<ReturnType<typeof getGroups>>>(
      groupsKey(userId)
    ) ?? [];

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <main className="min-h-screen bg-background px-4 py-8">
        <div className="mx-auto max-w-2xl">
          <h1 className="mb-8 text-2xl font-semibold text-foreground">
            Bookmarks
          </h1>
          <TimelineShell
            initialBookmarks={initialBookmarks}
            initialGroups={initialGroups}
          />
        </div>
      </main>
    </HydrationBoundary>
  );
}
