import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GlobeIcon } from "lucide-react";

export type TopDomainsCardProps = {
  rows: { domain: string; count: number }[];
  total: number;
};

export function TopDomainsCard({ rows, total }: TopDomainsCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <GlobeIcon className="size-3.5" />
          </div>
          <div>
            <CardTitle className="text-sm font-semibold">Top Domains</CardTitle>
            <CardDescription>Most bookmarked sites across all users.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="border-t border-border pt-3">
        {rows.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            No bookmarks with URLs yet.
          </p>
        ) : (
          <ol className="space-y-2.5">
            {rows.map((row, i) => {
              const pct = total > 0 ? Math.round((row.count / total) * 100) : 0;
              return (
                <li key={row.domain} className="flex items-center gap-3">
                  <span className="w-4 shrink-0 text-right text-[10px] tabular-nums text-muted-foreground">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate font-mono text-xs font-medium text-foreground">
                        {row.domain}
                      </span>
                      <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
                        {row.count.toLocaleString()}
                      </span>
                    </div>
                    <div className="h-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary/50"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
