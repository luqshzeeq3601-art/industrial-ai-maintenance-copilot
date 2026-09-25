import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { cn } from "../../lib/cn";
import { formatNumber } from "../../lib/format";

interface Delta {
  /** Signed change vs the named comparison period. */
  value: number;
  unit?: string;
  /** Whether an increase is good (availability) or bad (downtime). */
  higherIsBetter: boolean;
  period: string;
}

interface KpiTileProps {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  /** One short context line when there is no real delta. */
  context?: ReactNode;
  delta?: Delta | null;
  /** Optional real trend graphic (never decorative). */
  trend?: ReactNode;
  loading?: boolean;
  tone?: "neutral" | "danger" | "warn";
  className?: string;
}

/** One icon, one primary value (Geist Mono), one context line. Delta only when a real comparison exists. */
export function KpiTile({ icon: Icon, label, value, context, delta, trend, loading, tone = "neutral", className }: KpiTileProps) {
  return (
    <div className={cn("bg-panel border border-line rounded-[var(--radius-card)] px-5 py-4 min-w-0", className)}>
      <div className="flex items-center gap-2 text-meta font-medium text-body">
        <Icon
          className={cn("w-4 h-4 shrink-0", tone === "danger" ? "text-danger" : tone === "warn" ? "text-warn" : "text-accent")}
          strokeWidth={2}
          aria-hidden="true"
        />
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-2 flex items-end justify-between gap-3">
        <div className="min-w-0">
          {loading ? (
            <div className="skeleton h-8 w-24" aria-hidden="true" />
          ) : (
            <p className="font-data text-kpi font-semibold text-ink truncate">{value}</p>
          )}
          <div className="mt-1 min-h-[18px] text-meta text-body">
            {!loading && delta ? <DeltaLine delta={delta} /> : !loading && context}
          </div>
        </div>
        {!loading && trend}
      </div>
    </div>
  );
}

function DeltaLine({ delta }: { delta: Delta }) {
  const up = delta.value > 0;
  const flat = delta.value === 0;
  const good = flat ? null : up === delta.higherIsBetter;
  const Arrow = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className="inline-flex items-center gap-1">
      {!flat && (
        <span className={cn("inline-flex items-center font-semibold tabular", good ? "text-success" : "text-danger")}>
          <Arrow className="w-3.5 h-3.5" aria-hidden="true" />
          <span className="sr-only">{up ? "Up" : "Down"} </span>
          {formatNumber(Math.abs(delta.value), 1)}
          {delta.unit}
        </span>
      )}
      <span>{flat ? "No change" : ""} vs {delta.period}</span>
    </span>
  );
}
