import { DashboardHome } from "@/components/dashboard/dashboard-home";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <DashboardHome searchParams={searchParams} />;
}
