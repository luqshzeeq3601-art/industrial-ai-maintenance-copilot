import { OctagonAlert, TriangleAlert } from "lucide-react";
import type { Alarm } from "../../api/models";
import { cn } from "../../lib/cn";
import { formatDateTime } from "../../lib/format";
import { ButtonLink } from "../ui/Button";

/** The most severe active alarm: code, short title, one line, and the next step. */
export function AlarmBanner({ alarm, extra }: { alarm: Alarm; extra: number }) {
  const critical = alarm.severity === "critical" || alarm.severity === "high";
  const Icon = critical ? OctagonAlert : TriangleAlert;
  return (
    <section
      aria-labelledby="alarm-banner-title"
      className={cn(
        "flex flex-wrap items-center gap-4 rounded-[var(--radius-card)] border px-5 py-4",
        critical ? "bg-danger-bg border-danger-line" : "bg-warn-bg border-warn-line"
      )}
    >
      <Icon className={cn("w-7 h-7 shrink-0", critical ? "text-danger" : "text-warn")} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <h2 id="alarm-banner-title" className="flex flex-wrap items-center gap-2.5 text-title font-semibold text-ink">
          <span className={cn("font-data px-2 py-0.5 rounded-md text-white text-meta", critical ? "bg-danger-solid" : "bg-warn-solid")}>{alarm.code}</span>
          {alarm.fault_description ?? "Active alarm"}
        </h2>
        <p className="mt-1 text-meta text-body">
          {alarm.notes ? `${alarm.notes}. ` : ""}Raised <time className="font-data">{formatDateTime(alarm.triggered_at)}</time>
          {extra > 0 && `, plus ${extra} more active alarm${extra > 1 ? "s" : ""}`}.
        </p>
      </div>
      <ButtonLink to={`/diagnostics/${alarm.machine_id}/faults`} variant={critical ? "danger" : "primary"}>
        View diagnostics
      </ButtonLink>
    </section>
  );
}
