import { useState } from "react";
import { ChevronRight, FileText, Play } from "lucide-react";
import type { EquipmentData } from "../visualization/OperatingHoursBarChart";
import { DemoBadge } from "../shell/DemoDataBanner";
import { useNow } from "../../hooks/useNow";
import { formatRelative, isOpenWorkOrder, metricLabel, parseTimestamp, severityMeta, type TelemetryReading, type WorkOrderLog } from "./types";

interface TelemetryInspectorPanelProps {
  machine: EquipmentData;
  logs: WorkOrderLog[];
  logsState: "loading" | "ready" | "error";
  readings: TelemetryReading[];
  telemetryLoading: boolean;
  /** The latest poll failed; readings (if any) are the last values received. */
  telemetryFailed: boolean;
  /** Readings are sample data. */
  demo?: boolean;
  faultCode: string | null;
  /** A copilot answer is in progress; actions that ask a question wait for it. */
  busy: boolean;
  onRunDiagnostic: () => void;
  onViewSop: () => void;
  onSelectWorkOrder?: (log: WorkOrderLog) => void;
  onViewAllWorkOrders?: () => void;
}

const RECENT_LIMIT = 5;
const TILE_LIMIT = 4;
/** Older than this, the newest reading no longer counts as live. */
export const STALE_AFTER_MS = 5 * 60_000;

/** Bare temperature units from the feed ("C", "F") read as degrees. */
function formatUnit(unit: string): string {
  return /^[CF]$/i.test(unit) ? `°${unit.toUpperCase()}` : unit;
}

function formatValue(value: number): string {
  return Math.abs(value) >= 100 ? Math.round(value).toLocaleString() : String(Number(value.toFixed(2)));
}

/** Trend of the metric's real recent values; nothing is drawn with fewer than two points. */
function Sparkline({ values, severity }: { values: number[]; severity?: string | null }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const w = 38;
  const h = 14;
  const points = values.map((v, i) => `${((i / (values.length - 1)) * w).toFixed(1)},${(h - ((v - min) / span) * h + 1).toFixed(1)}`).join(" ");
  const sev = (severity ?? "").toLowerCase();
  const stroke = sev === "critical" || sev === "high" ? "var(--color-status-fault)" : sev === "medium" || sev === "warn" ? "var(--color-status-maint)" : "var(--color-subtle)";
  return (
    <svg className="w-9 h-4 shrink-0 overflow-visible" viewBox={`0 0 ${w} ${h + 2}`} aria-hidden="true">
      <polyline fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  );
}

type FeedStatus = { label: string; dot: string; detail: string };

function feedStatus(readings: TelemetryReading[], failed: boolean, demo: boolean, now: number): FeedStatus {
  const newest = Math.max(0, ...readings.map((r) => parseTimestamp(r.timestamp)?.getTime() ?? 0));
  const age = newest ? formatRelative(new Date(newest), now) : "";
  if (demo) return { label: "Demo", dot: "bg-status-maint", detail: "Sample readings, not from the plant" };
  if (failed) return { label: "Offline", dot: "bg-status-fault", detail: age ? `Feed unreachable. Last reading ${age}` : "Feed unreachable" };
  if (!newest) return { label: "No data", dot: "bg-faint", detail: "No readings reported yet" };
  if (now - newest > STALE_AFTER_MS) return { label: "Stale", dot: "bg-status-maint", detail: `Last reading ${age}` };
  return { label: "Live", dot: "bg-status-ok", detail: `Last reading ${age}` };
}

/** Right rail: current readings, the actions an operator takes next, and the latest work orders. */
export function TelemetryInspectorPanel({
  machine,
  logs,
  logsState,
  readings,
  telemetryLoading,
  telemetryFailed,
  demo = false,
  faultCode,
  busy,
  onRunDiagnostic,
  onViewSop,
  onSelectWorkOrder,
  onViewAllWorkOrders
}: TelemetryInspectorPanelProps) {
  const [showAllReadings, setShowAllReadings] = useState(false);
  const now = useNow(15_000);
  const tiles = showAllReadings ? readings : readings.slice(0, TILE_LIMIT);
  const recent = logs.slice(0, RECENT_LIMIT);
  const feed = feedStatus(readings, telemetryFailed, demo, now);

  return (
    <aside
      aria-label={`${machine.name} telemetry and actions`}
      className="w-full h-full overflow-y-auto custom-scrollbar bg-panel rounded-xl border border-line-strong/70 shadow-[var(--shadow-cockpit)] divide-y divide-line"
    >
      <section aria-labelledby="telemetry-heading" className="p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 id="telemetry-heading" className="text-sm font-bold text-ink tracking-tight">
            Telemetry inspector
          </h2>
          {demo ? (
            <DemoBadge />
          ) : (
            !telemetryLoading && (
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shadow-xs"
                title={feed.detail}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${feed.dot} animate-pulse`} aria-hidden="true" />
                <span>{feed.label}</span>
              </span>
            )
          )}
        </div>
        {!telemetryLoading && readings.length > 0 && <p className="mt-1 text-[11px] font-mono text-muted">{feed.detail}</p>}

        {telemetryLoading ? (
          <div className="mt-3 grid grid-cols-2 gap-2" role="status" aria-label="Loading telemetry">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="space-y-2 p-3 rounded-lg border border-line bg-sunken">
                <div className="skeleton h-3 w-16" />
                <div className="skeleton h-5 w-12" />
              </div>
            ))}
          </div>
        ) : readings.length === 0 ? (
          <p className="mt-2 text-small text-muted" role="status">
            {telemetryFailed ? "Telemetry is unavailable right now. It will retry automatically." : "No sensor readings reported for this asset yet."}
          </p>
        ) : (
          <>
            <div className="mt-3 grid grid-cols-2 gap-2.5" role="region" aria-label="Sensor readings">
              {tiles.map((r) => {
                const sev = severityMeta(r.severity);
                const label = metricLabel(r.metric);
                const s = (r.severity ?? "").toLowerCase();
                const isAlert = s === "critical" || s === "high" || s === "warn";

                return (
                  <div
                    key={r.metric}
                    className={`relative min-w-0 rounded-lg p-3 border transition-colors ${
                      isAlert ? "bg-red-50/70 border-red-300" : "bg-sunken border-line"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1 mb-1 text-[10px] font-mono font-semibold uppercase tracking-wider text-muted truncate" title={label}>
                      <span className="truncate">{label}</span>
                      <span className="shrink-0 font-normal">
                        <Sparkline values={r.history ?? []} severity={r.severity} />
                      </span>
                    </div>

                    <div className="mt-1">
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-bold font-mono text-ink tabular-nums leading-tight">{formatValue(r.value)}</span>
                        <span className="text-xs font-mono text-muted">{formatUnit(r.unit)}</span>
                      </div>

                      {/* Severity scale: five discrete segments */}
                      <div className="mt-2.5 flex items-center gap-1.5">
                        <div className="flex flex-1 gap-1" role="img" aria-label={`Severity: ${sev.label}`}>
                          {[0, 1, 2, 3, 4].map((step) => {
                            const active = sev.level >= (step + 1) * 0.2 || (step === 0 && sev.level > 0.05);
                            const fill = step >= 3 ? "bg-red-500" : step >= 2 ? "bg-amber-500" : "bg-emerald-500";
                            return <span key={step} className={`h-1.5 flex-1 rounded-xs transition-colors ${active ? fill : "bg-line"}`} />;
                          })}
                        </div>
                        <span className={`text-[10px] font-mono font-semibold ${sev.text}`} aria-hidden="true">
                          {sev.label}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {readings.length > TILE_LIMIT && (
              <button
                type="button"
                onClick={() => setShowAllReadings((v) => !v)}
                aria-expanded={showAllReadings}
                className="mt-2.5 min-h-[32px] pointer-coarse:min-h-[44px] text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
              >
                {showAllReadings ? "Show fewer readings" : `Show all ${readings.length} readings`}
              </button>
            )}
          </>
        )}
      </section>

      <section aria-labelledby="actions-heading" className="p-4 space-y-2">
        <h2 id="actions-heading" className="sr-only">
          Actions
        </h2>
        <button
          type="button"
          onClick={onRunDiagnostic}
          disabled={busy}
          className="w-full flex items-center justify-center gap-2 min-h-[42px] px-4 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Play className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
          Run diagnostic
        </button>
        <button
          type="button"
          onClick={onViewSop}
          disabled={busy}
          className="w-full flex items-center justify-center gap-2 min-h-[38px] px-4 rounded-lg border border-line bg-panel hover:bg-sunken text-ink text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <FileText className="w-3.5 h-3.5 text-subtle shrink-0" aria-hidden="true" />
          <span className="truncate">{faultCode ? `Safety SOP for ${faultCode}` : "Safety SOP"}</span>
        </button>
      </section>

      <section aria-labelledby="work-orders-heading" className="p-4">
        <div className="flex items-center justify-between gap-2 mb-2">
          <h2 id="work-orders-heading" className="text-sm font-bold text-ink tracking-tight">
            Recent work orders
          </h2>
          {onViewAllWorkOrders && logs.length > 0 && (
            <button
              type="button"
              onClick={onViewAllWorkOrders}
              className="shrink-0 whitespace-nowrap inline-flex items-center gap-0.5 text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
            >
              View all {logs.length}
              <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}
        </div>

        {logsState === "loading" ? (
          <div className="mt-2 space-y-2" role="status" aria-label="Loading work orders">
            <div className="skeleton h-12 w-full rounded-lg" />
            <div className="skeleton h-12 w-full rounded-lg" />
            <div className="skeleton h-12 w-4/5 rounded-lg" />
          </div>
        ) : logsState === "error" ? (
          <p className="mt-2 text-small text-muted" role="status">
            Work orders couldn't be loaded.
          </p>
        ) : logs.length === 0 ? (
          <p className="mt-2 text-small text-muted" role="status">
            No work orders recorded for this asset.
          </p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {recent.map((log) => {
              const open = isOpenWorkOrder(log);
              const action = log.action_taken || "Maintenance event";
              const when = formatRelative(log.started_at, now);
              return (
                <li key={log.id}>
                  <button
                    type="button"
                    onClick={() => onSelectWorkOrder?.(log)}
                    disabled={!onSelectWorkOrder || busy}
                    title={`${log.technician}: ${log.fault_description}`}
                    aria-label={`${log.fault_code} ${action}, ${open ? "open" : "closed"}, ${when}, technician ${log.technician}. Ask the copilot to investigate.`}
                    className="w-full p-2.5 rounded-lg text-left border border-line/60 hover:border-line hover:bg-sunken/80 transition-colors cursor-pointer disabled:cursor-default disabled:hover:bg-transparent group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${open ? "bg-red-500 animate-pulse" : "bg-muted/40"}`} aria-hidden="true" />
                        <span className="font-mono text-xs font-bold text-ink">{log.fault_code}</span>
                      </div>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full font-mono text-[10px] font-bold shrink-0 border ${
                          open
                            ? "bg-red-500/10 text-red-600 border-red-500/20"
                            : "bg-wash text-muted border-line"
                        }`}
                      >
                        {open ? "OPEN" : "CLOSED"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-ink/80 truncate leading-snug font-medium">{action}</p>
                    <div className="mt-1 flex items-center justify-between text-[11px] text-muted font-mono">
                      <span>{when}</span>
                      <span className="text-subtle font-sans">{log.technician}</span>
                    </div>
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
