import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { getServiceConfigForAdmin } from "@/lib/app-config";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type HealthStatus = "ok" | "warning" | "error";

interface HealthItem {
  label: string;
  status: HealthStatus;
  detail: string;
}

async function getSystemHealth(): Promise<{
  db: HealthItem;
  services: HealthItem[];
}> {
  let dbOk = false;
  let dbSize: string | undefined;
  try {
    await db.execute(sql`SELECT 1`);
    dbOk = true;
    const result = await db.execute<{ size: string }>(
      sql`SELECT pg_size_pretty(pg_database_size(current_database())) AS size`
    );
    dbSize = result.rows[0]?.size;
  } catch {
    // db error handled below
  }

  const serviceConfig = await getServiceConfigForAdmin();
  const services: HealthItem[] = [
    {
      label: "Email (Resend)",
      status: serviceConfig.resendConfigured ? "ok" : "warning",
      detail: serviceConfig.resendConfigured
        ? "Configured"
        : "Resend API key missing - password reset emails disabled",
    },
    {
      label: "AI Auto-Group (OpenRouter)",
      status: serviceConfig.openrouterConfigured ? "ok" : "warning",
      detail: serviceConfig.openrouterConfigured
        ? "Configured"
        : "OpenRouter API key missing - AI categorization disabled",
    },
    {
      label: "Sender Email",
      status: serviceConfig.resendFromEmail ? "ok" : "warning",
      detail: serviceConfig.resendFromEmail || "Using Resend default sender",
    },
    {
      label: "Admin Email",
      status: process.env.ADMIN_EMAIL ? "ok" : "error",
      detail: process.env.ADMIN_EMAIL
        ? process.env.ADMIN_EMAIL
        : "ADMIN_EMAIL not set",
    },
    {
      label: "App URL",
      status: process.env.NEXT_PUBLIC_APP_URL ? "ok" : "warning",
      detail:
        process.env.NEXT_PUBLIC_APP_URL ?? "Falling back to localhost:3000",
    },
  ];

  return {
    db: {
      label: "Database",
      status: dbOk ? "ok" : "error",
      detail: dbOk
        ? dbSize
          ? `Connected - ${dbSize}`
          : "Connected"
        : "Connection failed",
    },
    services,
  };
}

function StatusDot({ status }: { status: HealthStatus }) {
  const colors: Record<HealthStatus, string> = {
    ok: "bg-emerald-500",
    warning: "bg-amber-500",
    error: "bg-destructive",
  };
  return (
    <span
      className={`mt-0.5 inline-block size-2 shrink-0 rounded-full ${colors[status]}`}
    />
  );
}

export async function SystemHealthCard() {
  const { db: dbHealth, services } = await getSystemHealth();
  const all = [dbHealth, ...services];
  const errors = all.filter((i) => i.status === "error").length;
  const warnings = all.filter((i) => i.status === "warning").length;

  return (
    <Card size="sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold">System Health</CardTitle>
          {errors > 0 ? (
            <span className="text-xs font-medium text-destructive">
              {errors} error{errors > 1 ? "s" : ""}
            </span>
          ) : warnings > 0 ? (
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
              {warnings} warning{warnings > 1 ? "s" : ""}
            </span>
          ) : (
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              All systems ok
            </span>
          )}
        </div>
        <CardDescription>Service configuration and connectivity.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2.5 border-t border-border pt-3">
        {all.map((item) => (
          <div key={item.label} className="flex items-start gap-2">
            <StatusDot status={item.status} />
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground">{item.label}</p>
              <p className="truncate text-xs text-muted-foreground">
                {item.detail}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
