import { CalendarClock, CircleCheck, Clock, OctagonAlert, TriangleAlert } from "lucide-react";
import type { Equipment } from "../../api/models";
import { cn } from "../../lib/cn";
import type { Condition } from "../../lib/condition";
import { formatHours } from "../../lib/format";

const CONDITION = {
  critical: { label: "Critical", icon: OctagonAlert, text: "text-danger", surface: "bg-danger-bg border-danger-line" },
  warning: { label: "Warning", icon: TriangleAlert, text: "text-warn", surface: "bg-warn-bg border-warn-line" },
  good: { label: "Good", icon: CircleCheck, text: "text-success", surface: "bg-panel border-line" }
} as const;

/** Three KPI blocks max (spec): operating hours toward service, next service, condition. */
export function AssetKpis({ asset, condition, reason }: { asset: Equipment; condition: Condition; reason: string }) {
  const interval = asset.service_interval_hours;
  const since = asset.hours_at_last_service != null ? asset.operating_hours - asset.hours_at_last_service : null;
  const progress = interval && since != null ? Math.min(since / interval, 1) : null;
  const left = asset.next_service_in_hours;
  const c = CONDITION[condition];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="rounded-[var(--radius-card)] border border-line bg-panel px-5 py-4">
        <p className="flex items-center gap-2 text-meta font-medium text-body">
          <Clock className="w-4 h-4 text-accent" aria-hidden="true" />
          Operating hours
        </p>
        <p className="mt-2 font-data text-kpi font-semibold">{formatHours(asset.operating_hours)}</p>
        {progress != null && (
          <div className="mt-3">
            <div
              role="progressbar"
              aria-label="Hours used of the service interval"
              aria-valuemin={0}
              aria-valuemax={interval!}
              aria-valuenow={Math.min(since!, interval!)}
              className="h-2 rounded-full bg-wash overflow-hidden"
            >
              <div className={cn("h-full rounded-full", progress >= 1 ? "bg-danger" : progress >= 0.9 ? "bg-status-maint" : "bg-accent")} style={{ width: `${progress * 100}%` }} />
            </div>
            <p className="mt-1.5 text-label text-body">
              <span className="font-data">{formatHours(since)}</span> since last service
            </p>
          </div>
        )}
      </div>

      <div className="rounded-[var(--radius-card)] border border-line bg-panel px-5 py-4">
        <p className="flex items-center gap-2 text-meta font-medium text-body">
          <CalendarClock className="w-4 h-4 text-accent" aria-hidden="true" />
          Next service
        </p>
        <p className={cn("mt-2 font-data text-kpi font-semibold", left != null && left < 0 && "text-danger")}>
          {left == null ? "—" : left < 0 ? `${formatHours(-left)} over` : `in ${formatHours(left)}`}
        </p>
        <p className="mt-1 text-meta text-body">
          {interval ? (
            <>
              Interval <span className="font-data">{formatHours(interval)}</span>
            </>
          ) : (
            "No service interval set"
          )}
        </p>
      </div>

      <div className={cn("rounded-[var(--radius-card)] border px-5 py-4", c.surface)}>
        <p className="text-meta font-medium text-body">Condition</p>
        <p className={cn("mt-2 flex items-center gap-2 text-kpi font-bold", c.text)}>
          <c.icon className="w-6 h-6" aria-hidden="true" />
          {c.label}
        </p>
        <p className="mt-1 text-meta text-body">{reason}</p>
      </div>
    </div>
  );
}
