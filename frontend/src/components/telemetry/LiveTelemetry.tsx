import { useState } from "react";
import type { SampleMetric } from "../../api/models";
import { useSamples } from "../../api/queries";
import { Card, CardHeader } from "../ui/Card";
import { SelectFilter } from "../ui/Filters";
import { MetricTiles } from "./MetricTiles";
import { METRICS, TIME_WINDOWS, windowStart, type TimeWindowId } from "./metrics";
import { TelemetryChart } from "./TelemetryChart";
import { TelemetrySummaryTable } from "./TelemetrySummaryTable";

/** Live Data tab: latest readings, then the time-aligned sensor chart with window and sensor toggles. */
export function LiveTelemetry({ machineId }: { machineId: string }) {
  const [windowId, setWindowId] = useState<TimeWindowId>("24h");
  const [visible, setVisible] = useState<Set<SampleMetric>>(() => new Set(METRICS.map((m) => m.id)));
  const [asTable, setAsTable] = useState(false);
  const win = TIME_WINDOWS.find((w) => w.id === windowId)!;
  const since = windowStart(win.hours);
  const samples = useSamples(machineId, since);
  const data = samples.data?.samples ?? [];

  const toggle = (id: SampleMetric) =>
    setVisible((prev) => {
      const next = new Set(prev);
      if (next.has(id) && next.size > 1) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="space-y-4">
      <MetricTiles samples={samples.data?.samples} isLoading={samples.isLoading} error={samples.error} onRetry={() => void samples.refetch()} windowLabel={win.label} />
      <Card aria-labelledby="telemetry-heading">
        <CardHeader
          id="telemetry-heading"
          title="Live telemetry"
          subtitle="Each sensor on its own scale, sharing one time axis"
          action={
            <SelectFilter
              label="Time window"
              value={windowId}
              onChange={(v) => setWindowId((v || "24h") as TimeWindowId)}
              options={TIME_WINDOWS.map((w) => ({ value: w.id, label: w.label }))}
              className="w-44"
            />
          }
        />
        <div className="px-5 pb-5">
          <fieldset className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-4">
            <legend className="sr-only">Sensors shown</legend>
            {METRICS.map((m) => (
              <label key={m.id} className="inline-flex items-center gap-2 min-h-10 text-small text-ink cursor-pointer">
                <input type="checkbox" checked={visible.has(m.id)} onChange={() => toggle(m.id)} className="w-4 h-4 accent-[var(--color-accent)]" />
                {m.label}
              </label>
            ))}
            <button type="button" onClick={() => setAsTable((v) => !v)} aria-pressed={asTable} className="ml-auto h-10 px-2 text-small font-semibold text-accent hover:text-accent-hover cursor-pointer">
              {asTable ? "Show chart" : "Show as table"}
            </button>
          </fieldset>
          {samples.isLoading ? (
            <div className="skeleton h-[400px]" aria-hidden="true" />
          ) : data.length === 0 ? (
            <p role="status" className="py-10 text-center text-meta text-body">
              No sensor readings in the {win.label.toLowerCase()}. Choose a longer window.
            </p>
          ) : asTable ? (
            <TelemetrySummaryTable samples={data} visible={visible} />
          ) : (
            <TelemetryChart samples={data} visible={visible} since={new Date(since)} until={new Date()} />
          )}
        </div>
      </Card>
    </div>
  );
}
