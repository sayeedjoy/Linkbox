"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TrendingUpIcon } from "lucide-react";

export interface ActivityDataPoint {
  date: string; // YYYY-MM-DD
  count: number;
}

interface ActivityChartProps {
  data7d: ActivityDataPoint[];
  data30d: ActivityDataPoint[];
}

function formatDate(dateStr: string, short = false) {
  const d = new Date(dateStr + "T12:00:00Z");
  if (short) return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
}

function SparkBars({ data }: { data: ActivityDataPoint[] }) {
  const [tooltip, setTooltip] = useState<{ index: number; x: number; y: number } | null>(null);

  if (data.length === 0) {
    return (
      <div className="flex h-24 items-center justify-center text-xs text-muted-foreground">
        No activity in this period
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d.count), 1);
  const barWidth = 100 / data.length;
  const GAP = 0.6;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 100 32`}
        className="h-20 w-full"
        preserveAspectRatio="none"
        onMouseLeave={() => setTooltip(null)}
      >
        {data.map((pt, i) => {
          const barH = Math.max((pt.count / max) * 28, pt.count > 0 ? 1 : 0);
          const x = i * barWidth + GAP / 2;
          const w = barWidth - GAP;
          const y = 32 - barH;
          return (
            <rect
              key={pt.date}
              x={x}
              y={y}
              width={w}
              height={barH}
              rx={0.5}
              className={`transition-colors ${
                tooltip?.index === i
                  ? "fill-primary"
                  : "fill-primary/40 hover:fill-primary/70"
              }`}
              onMouseEnter={(e) => {
                const svg = (e.currentTarget as SVGElement).closest("svg")!;
                const rect = svg.getBoundingClientRect();
                const relX = ((i + 0.5) * barWidth) / 100;
                setTooltip({
                  index: i,
                  x: relX * rect.width,
                  y: rect.height * (y / 32),
                });
              }}
            />
          );
        })}
      </svg>

      {tooltip !== null && data[tooltip.index] && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md border border-border bg-popover px-2 py-1 text-xs shadow-md"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <p className="font-medium text-foreground">{data[tooltip.index]!.count} bookmarks</p>
          <p className="text-muted-foreground">{formatDate(data[tooltip.index]!.date)}</p>
        </div>
      )}

      {/* X-axis labels: show first, middle, last */}
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        {data[0] && <span>{formatDate(data[0].date, true)}</span>}
        {data.length > 2 && data[Math.floor(data.length / 2)] && (
          <span>{formatDate(data[Math.floor(data.length / 2)]!.date, true)}</span>
        )}
        {data[data.length - 1] && <span>{formatDate(data[data.length - 1]!.date, true)}</span>}
      </div>
    </div>
  );
}

export function ActivityChart({ data7d, data30d }: ActivityChartProps) {
  const [range, setRange] = useState<"7d" | "30d">("7d");
  const data = range === "7d" ? data7d : data30d;
  const total = data.reduce((s, d) => s + d.count, 0);

  return (
    <Card size="sm">
      <CardHeader className="space-y-0 pb-0">
        <div className="flex items-center justify-between">
          <CardDescription className="text-xs font-medium uppercase tracking-widest">
            Activity
          </CardDescription>
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/50 p-0.5">
              {(["7d", "30d"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRange(r)}
                  className={`rounded-md px-2 py-0.5 text-xs font-medium transition-colors ${
                    range === r
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <div className="flex size-7 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <TrendingUpIcon className="size-3.5" />
            </div>
          </div>
        </div>
        <p className="pt-1 text-xl font-semibold tabular-nums tracking-tight text-foreground sm:text-2xl">
          {total.toLocaleString()}
        </p>
        <p className="text-xs text-muted-foreground">
          New bookmarks, last {range === "7d" ? "7" : "30"} days
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        <SparkBars data={data} />
      </CardContent>
    </Card>
  );
}
