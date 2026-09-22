import { ChevronRight, FileText, Play } from "lucide-react";
import type { EquipmentData } from "../visualization/OperatingHoursBarChart";
import { isOpenWorkOrder, metricLabel, severityMeta, type TelemetryReading, type WorkOrderLog } from "./types";

interface TelemetryInspectorPanelProps {
  machine: EquipmentData;
  logs: WorkOrderLog[];
  logsState: "loading" | "ready" | "error";
  readings: TelemetryReading[];
  telemetryLoading: boolean;
  /** The telemetry feed could not be reached. */
  telemetryFailed: boolean;
  faultCode: string | null;
  /** A copilot answer is in progress; actions that ask a question wait for it. */
  busy: boolean;
  onRunDiagnostic: () => void;
  onViewSop: () => void;
  onSelectWorkOrder?: (log: WorkOrderLog) => void;
  onViewAllWorkOrders?: () => void;
}

const RECENT_LIMIT = 5;
const SECTION = "px-4 py-4 border-t border-line first:border-t-0";
const SECTION_TITLE = "text-[14px] font-semibold text-ink";
const SECONDARY_ACTION =
  "w-full flex items-center justify-center gap-2 min-h-[40px] pointer-coarse:min-h-[44px] px-3 rounded-md border border-line-strong bg-panel hover:bg-sunken text-ink text-[13px] font-medium transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed";

/** Bare temperature units from the feed ("C", "F") read as degrees. */
function formatUnit(unit: string): string {
  return /^[CF]$/i.test(unit) ? `°${unit.toUpperCase()}` : unit;
}

function formatValue(value: number): string {
  return Math.abs(value) >= 100 ? Math.round(value).toLocaleString() : String(Number(value.toFixed(2)));
}

/** Right rail: live readings, the actions an operator takes next, and the latest work orders. */
export function TelemetryInspectorPanel({
  machine,
  logs,
  logsState,
  readings,
  telemetryLoading,
  telemetryFailed,
  faultCode,
  busy,
  onRunDiagnostic,
  onViewSop,
  onSelectWorkOrder,
  onViewAllWorkOrders
}: TelemetryInspectorPanelProps) {
  const tiles = readings.slice(0, 4);
  const recent = logs.slice(0, RECENT_LIMIT);

  return (
    <aside
      aria-label={`${machine.name} telemetry and actions`}
      className="w-full h-full overflow-y-auto custom-scrollbar bg-panel rounded-xl border border-line shadow-[var(--shadow-tinted-xs)]"
    >
      <section aria-labelledby="telemetry-heading" className={SECTION}>
        <h2 id="telemetry-heading" className={SECTION_TITLE}>Telemetry</h2>

        {telemetryLoading ? (
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-4" role="status" aria-label="Loading telemetry">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div className="skeleton h-3 w-20" />
                <div className="skeleton h-5 w-14" />
              </div>
            ))}
          </div>
        ) : telemetryFailed ? (
          <p className="mt-2 text-[13px] text-muted" role="status">
            Telemetry is unavailable right now.
          </p>
        ) : tiles.length === 0 ? (
          <p className="mt-2 text-[13px] text-muted" role="status">
            No sensor readings reported for this asset yet.
          </p>
        ) : (
          <dl className="mt-3 grid grid-cols-2 gap-2">
            {tiles.map((r) => {
              const sev = severityMeta(r.severity);
              const label = metricLabel(r.metric);
              return (
                <div key={r.metric} className="min-w-0 rounded-lg bg-sunken border border-line px-3 py-2.5">
                  <dt className="text-[12px] text-muted truncate" title={label}>{label}</dt>
                  <dd className="mt-0.5">
                    <span className="text-[17px] font-semibold text-ink tabular-nums">{formatValue(r.value)}</span>
                    <span className="text-[13px] text-muted"> {formatUnit(r.unit)}</span>
                    <div
                      className="mt-2 h-1 w-full rounded-full bg-line overflow-hidden"
                      role="meter"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(sev.level * 100)}
                      aria-label={`${label} severity ${sev.label}`}
                      title={`Severity: ${sev.label}`}
                    >
                      <div className={`h-full rounded-full ${sev.bar}`} style={{ width: `${sev.level * 100}%` }} />
                    </div>
                  </dd>
                </div>
              );
            })}
          </dl>
        )}
      </section>

      <section aria-labelledby="actions-heading" className={SECTION}>
        <h2 id="actions-heading" className="sr-only">Actions</h2>
        <button
          type="button"
          onClick={onRunDiagnostic}
          disabled={busy}
          className="w-full flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-md bg-accent hover:bg-accent-hover active:bg-accent-press text-white text-[14px] font-semibold transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Play className="w-4 h-4 fill-current" aria-hidden="true" />
          Run diagnostic
        </button>
        <button type="button" onClick={onViewSop} disabled={busy} className={`mt-2 ${SECONDARY_ACTION}`}>
          <FileText className="w-4 h-4 text-subtle shrink-0" aria-hidden="true" />
          <span className="truncate">{faultCode ? `Safety SOP for ${faultCode}` : "Safety SOP"}</span>
        </button>
      </section>

      <section aria-labelledby="work-orders-heading" className={SECTION}>
        <div className="flex items-center justify-between gap-2">
          <h2 id="work-orders-heading" className={SECTION_TITLE}>Recent work orders</h2>
          {onViewAllWorkOrders && logs.length > 0 && (
            <button
              type="button"
              onClick={onViewAllWorkOrders}
              className="inline-flex items-center gap-0.5 min-h-[36px] -mr-1.5 px-1.5 text-[13px] font-medium text-accent hover:underline cursor-pointer"
            >
              View all {logs.length}
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>

        {logsState === "loading" ? (
          <div className="mt-2 space-y-2" role="status" aria-label="Loading work orders">
            <div className="skeleton h-7 w-full" />
            <div className="skeleton h-7 w-full" />
            <div className="skeleton h-7 w-4/5" />
          </div>
        ) : logsState === "error" ? (
          <p className="mt-2 text-[13px] text-muted" role="status">Work orders couldn't be loaded.</p>
        ) : logs.length === 0 ? (
          <p className="mt-2 text-[13px] text-muted" role="status">No work orders recorded for this asset.</p>
        ) : (
          <ul className="mt-2 -mx-2 space-y-0.5">
            {recent.map((log) => {
              const open = isOpenWorkOrder(log);
              const action = log.action_taken || "Maintenance event";
              return (
                <li key={log.id}>
                  <button
                    type="button"
                    onClick={() => onSelectWorkOrder?.(log)}
                    disabled={!onSelectWorkOrder || busy}
                    title={`${log.technician}: ${log.fault_description}`}
                    aria-label={`${log.fault_code} ${action}, ${open ? "open" : "closed"}, technician ${log.technician}. Ask the copilot to investigate.`}
                    className="w-full flex items-start gap-2.5 px-2 py-2 rounded-md text-left hover:bg-sunken transition-colors cursor-pointer disabled:cursor-default disabled:hover:bg-transparent focus-visible:outline-offset-[-2px]"
                  >
                    <span className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${open ? "bg-status-fault" : "bg-status-ok"}`} aria-hidden="true" />
                    <span className="flex-1 min-w-0">
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[13px] font-semibold text-ink">{log.fault_code}</span>
                        <span
                          className={`inline-flex h-5 items-center px-1.5 rounded text-[11px] font-medium shrink-0 ${
                            open ? "bg-danger-bg text-danger-ink" : "bg-wash text-muted"
                          }`}
                        >
                          {open ? "Open" : "Closed"}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-[12px] text-muted truncate">{action}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </aside>
  );
}
