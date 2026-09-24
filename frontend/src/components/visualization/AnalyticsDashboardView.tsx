import { useEffect, useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import { Activity, ArrowDownRight, ArrowUpRight, CircleAlert, Clock, Hourglass, RefreshCw } from "lucide-react";
import { FleetHealthDonut } from "./FleetHealthDonut";
import { OperatingHoursBarChart, type EquipmentData } from "./OperatingHoursBarChart";
import { FaultDistributionChart } from "./FaultDistributionChart";
import { AndonStrip, type AndonFilter } from "./AndonStrip";
import { DemoBadge } from "../shell/DemoDataBanner";
import { DEMO_DATA } from "../../config";
import { DEMO_FAULTS } from "../../defaults";

interface FleetHealthData {
  total_units: number;
  total_operating_hours: number;
  avg_operating_hours: number;
  total_downtime_hours: number;
  repairs_logged?: number;
  period_days?: number | null;
  previous_downtime_hours?: number | null;
  previous_repairs_logged?: number | null;
  status_distribution: Record<string, number>;
}

interface FaultCategoriesData {
  fault_categories: Array<{ category: string; count: number }>;
  severity_distribution: Array<{ severity: string; count: number }>;
  incident_breakdown: Array<{ category: string; occurrences: number; total_downtime_mins: number }>;
}

interface AnalyticsDashboardViewProps {
  apiBase: string;
  equipmentList: EquipmentData[];
  /** The fleet itself is sample data; analytics follow it rather than calling the API. */
  demo?: boolean;
  selectedMachineId?: string;
  onSelectMachine: (machineId: string) => void;
}

/** Shared card surface; matches the workspace panels. */
export const CARD = "bg-panel rounded-xl border border-line-strong/70 shadow-[var(--shadow-cockpit)]";

const PERIODS: { id: string; label: string; days: number | null }[] = [
  { id: "30", label: "30 days", days: 30 },
  { id: "90", label: "90 days", days: 90 },
  { id: "365", label: "12 months", days: 365 },
  { id: "all", label: "All time", days: null }
];

const STATUS_ORDER = ["operational", "maintenance", "fault"];
const STATUS_FILL: Record<string, string> = {
  operational: "bg-status-ok",
  maintenance: "bg-status-maint",
  fault: "bg-status-fault"
};

interface Analytics {
  source: "live" | "demo";
  health: FleetHealthData;
  faults: FaultCategoriesData;
  updatedAt: Date;
}

/** Response for one request (period + refresh); a different key means that request is still loading. */
interface Response {
  key: string;
  data: Analytics | null;
  error: boolean;
}

function fetchJson<T>(url: string, signal: AbortSignal): Promise<T> {
  return fetch(url, { signal }).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json() as Promise<T>;
  });
}

/** Sample analytics derived from the sample fleet; only used when demo data is on. */
function demoAnalytics(equipment: EquipmentData[]): { health: FleetHealthData; faults: FaultCategoriesData } {
  const count = (s: string) => equipment.filter((e) => e.status.toLowerCase() === s).length;
  const totalHours = equipment.reduce((sum, e) => sum + (e.operating_hours || 0), 0);
  const downtimeMins = DEMO_FAULTS.incident_breakdown.reduce((sum, r) => sum + r.total_downtime_mins, 0);
  return {
    health: {
      total_units: equipment.length,
      total_operating_hours: totalHours,
      avg_operating_hours: equipment.length ? totalHours / equipment.length : 0,
      total_downtime_hours: Math.round(downtimeMins / 6) / 10,
      repairs_logged: DEMO_FAULTS.incident_breakdown.reduce((sum, r) => sum + r.occurrences, 0),
      period_days: null,
      status_distribution: { operational: count("operational"), maintenance: count("maintenance"), fault: count("fault") }
    },
    faults: DEMO_FAULTS
  };
}

/** Change against the previous period of the same length; null when there is nothing to compare. */
function periodDelta(current: number, previous: number | null | undefined, days: number | null | undefined, unit: string): ReactNode | null {
  if (!days || previous == null) return null;
  if (previous === 0) {
    return <span className="text-meta text-muted">{current > 0 ? `None in the previous ${days} days` : `Also none in the previous ${days} days`}</span>;
  }
  const change = Math.round(((current - previous) / previous) * 100);
  if (change === 0) return <span className="text-meta text-muted">Same as the previous {days} days</span>;
  const worse = change > 0;
  const Icon = worse ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-1 font-medium ${worse ? "text-danger" : "text-success"}`}>
      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>
        <span className="sr-only">{unit} {worse ? "up" : "down"} </span>
        {Math.abs(change)}% vs previous {days} days
      </span>
    </span>
  );
}

interface KpiCardProps {
  label: string;
  icon?: ReactNode;
  iconBg?: string;
  tone?: string;
  value: ReactNode;
  caption: ReactNode;
  chart?: ReactNode;
}

function KpiCard({ label, icon, iconBg = "bg-wash", tone = "text-ink", value, caption, chart }: KpiCardProps) {
  return (
    <div className={`${CARD} p-5 flex items-start justify-between gap-4 transition-all hover:shadow-md`}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2.5">
          {icon && (
            <div className={`w-9 h-9 rounded-full ${iconBg} flex items-center justify-center shrink-0 shadow-xs border border-black/5`}>
              {icon}
            </div>
          )}
          <p className="text-small font-semibold text-muted tracking-tight">{label}</p>
        </div>
        <p className={`mt-3 text-display font-extrabold tracking-tight tabular-nums leading-none ${tone}`}>{value}</p>
        <div className="mt-2 text-meta text-muted flex items-center gap-1">{caption}</div>
      </div>
      {chart && <div className="shrink-0 self-center">{chart}</div>}
    </div>
  );
}

/** One square/pill per unit, coloured by live status, aligned in 2 rows. */
function UnitGrid({ statuses, label }: { statuses: string[]; label: string }) {
  return (
    <div className="grid grid-cols-6 gap-1.5 p-1 rounded-lg bg-sunken/60 border border-line" role="img" aria-label={label}>
      {statuses.map((st, i) => (
        <span key={i} className={`w-3.5 h-3 rounded-[3px] ${STATUS_FILL[st] ?? "bg-faint"} shadow-2xs`} />
      ))}
    </div>
  );
}

/** Stepped vertical bar chart graphic (8 ascending blue bars) */
function SteppedBlueBars() {
  const heights = [22, 32, 45, 56, 68, 78, 88, 100];
  return (
    <div className="flex items-end gap-1 h-12 px-1" aria-hidden="true">
      {heights.map((h, i) => (
        <span
          key={i}
          className="w-1.5 bg-blue-600 rounded-xs transition-all"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
}

/** Stepped vertical bar chart graphic (7 ascending amber bars) */
function SteppedAmberBars() {
  const heights = [25, 38, 52, 65, 76, 88, 100];
  return (
    <div className="flex items-end gap-1 h-12 px-1" aria-hidden="true">
      {heights.map((h, i) => (
        <span
          key={i}
          className="w-1.5 bg-amber-500 rounded-xs transition-all"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
}


function KpiSkeleton() {
  return (
    <div className={`${CARD} p-4 snap-start`} aria-hidden="true">
      <div className="space-y-2.5">
        <div className="skeleton h-3.5 w-28" />
        <div className="skeleton h-7 w-24" />
        <div className="skeleton h-3 w-36" />
      </div>
    </div>
  );
}

function PeriodPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const onKey = (e: KeyboardEvent<HTMLButtonElement>, idx: number) => {
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = PERIODS[(idx + step + PERIODS.length) % PERIODS.length];
    onChange(next.id);
    (e.currentTarget.parentElement?.querySelector(`[data-period="${next.id}"]`) as HTMLElement | null)?.focus();
  };
  return (
    <div role="radiogroup" aria-label="Reporting period" className="inline-flex p-0.5 rounded-md bg-wash">
      {PERIODS.map(({ id, label }, idx) => {
        const on = value === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            data-period={id}
            onClick={() => onChange(id)}
            onKeyDown={(e) => onKey(e, idx)}
            className={`min-h-[32px] pointer-coarse:min-h-[44px] px-2.5 sm:px-3 rounded text-small font-medium whitespace-nowrap transition-colors cursor-pointer ${
              on ? "bg-panel text-ink shadow-[var(--shadow-tinted-xs)]" : "text-muted hover:text-ink"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function AnalyticsDashboardView({ apiBase, equipmentList, demo = false, selectedMachineId, onSelectMachine }: AnalyticsDashboardViewProps) {
  const [periodId, setPeriodId] = useState("30");
  const [refreshKey, setRefreshKey] = useState(0);
  const [response, setResponse] = useState<Response>({ key: "", data: null, error: false });
  const [andonFilter, setAndonFilter] = useState<AndonFilter>("all");
  const period = PERIODS.find((p) => p.id === periodId) ?? PERIODS[0];
  const requestKey = `${period.days ?? "all"}:${refreshKey}`;

  // A demo fleet gets demo analytics without calling the API
  const demoData = useMemo<Analytics | null>(
    () => (demo ? { source: "demo", ...demoAnalytics(equipmentList), updatedAt: new Date() } : null),
    [demo, equipmentList]
  );

  useEffect(() => {
    if (demo) return;
    const controller = new AbortController();
    const query = period.days ? `?days=${period.days}` : "";
    Promise.all([
      fetchJson<FleetHealthData>(`${apiBase}/api/analytics/fleet-health${query}`, controller.signal),
      fetchJson<FaultCategoriesData>(`${apiBase}/api/analytics/fault-categories${query}`, controller.signal)
    ])
      .then(([health, faults]) => setResponse({ key: requestKey, data: { source: "live", health, faults, updatedAt: new Date() }, error: false }))
      .catch(() => {
        if (controller.signal.aborted) return;
        setResponse(
          DEMO_DATA
            ? { key: requestKey, data: { source: "demo", ...demoAnalytics(equipmentList), updatedAt: new Date() }, error: false }
            : { key: requestKey, data: null, error: true }
        );
      });
    return () => controller.abort();
  }, [apiBase, demo, equipmentList, period.days, requestKey]);

  const refresh = () => setRefreshKey((k) => k + 1);

  const loading = !demo && response.key !== requestKey;
  const failed = !demo && !loading && response.error;
  // While a new period loads, the previous figures stay visible (the header says it is refreshing)
  const ready = demoData ?? response.data;
  const health = failed ? undefined : ready?.health;
  const faults = failed ? undefined : ready?.faults;
  const isDemo = ready?.source === "demo";
  const shownPeriod = isDemo ? "All time" : period.label;
  const periodDays = isDemo ? null : period.days;

  const unitsByStatus = [...equipmentList].sort(
    (a, b) => STATUS_ORDER.indexOf(a.status.toLowerCase()) - STATUS_ORDER.indexOf(b.status.toLowerCase())
  );
  const running = health?.status_distribution.operational ?? 0;
  const runningPct = health?.total_units ? Math.round((running / health.total_units) * 100) : 0;
  const repairs = health?.repairs_logged ?? (faults?.incident_breakdown ?? []).reduce((sum, r) => sum + r.occurrences, 0);

  return (
    <div className="mx-auto w-full max-w-[1440px] px-1 sm:px-2 py-2 space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-heading sm:text-display font-bold text-ink tracking-tight">
            Dashboard
            {isDemo && <DemoBadge />}
          </h1>
          <p className="mt-1 text-small text-muted font-normal" aria-live="polite">
            Fleet overview, asset status, and maintenance insights
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!isDemo && <PeriodPicker value={periodId} onChange={setPeriodId} />}
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="inline-flex items-center gap-2 min-h-[36px] pointer-coarse:min-h-[44px] px-3.5 rounded-lg border border-line-strong bg-panel text-small font-semibold text-body hover:bg-wash hover:text-ink disabled:opacity-60 transition-colors cursor-pointer shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </header>

      {failed && (
        <div role="alert" className="flex flex-wrap items-center gap-3 px-4 py-3 rounded-lg bg-danger-bg border border-danger-line">
          <CircleAlert className="w-5 h-5 shrink-0 text-danger" aria-hidden="true" />
          <p className="flex-1 min-w-[220px] text-copy text-danger-ink">
            <strong className="font-semibold">Plant analytics didn't load.</strong> The maintenance service isn't responding, so no figures are shown.
          </p>
          <button
            type="button"
            onClick={refresh}
            className="min-h-[36px] px-4 rounded-md bg-panel border border-danger-line text-small font-semibold text-danger-ink hover:bg-danger-bg cursor-pointer"
          >
            Try again
          </button>
        </div>
      )}

      {/* 3 Top KPI Cards matching Image 1: Plant availability, Total operating hours, Cumulative downtime */}
      {!failed && (
        <div
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
          role={health ? undefined : "status"}
          aria-label={health ? undefined : "Loading plant analytics"}
        >
          {!health ? (
            <>
              <KpiSkeleton />
              <KpiSkeleton />
              <KpiSkeleton />
            </>
          ) : (
            <>
              <KpiCard
                label="Plant availability"
                icon={<Activity className="w-4 h-4 text-emerald-600" />}
                iconBg="bg-emerald-50"
                value={`${runningPct}%`}
                caption={
                  <span className="font-medium">
                    {running} / {health.total_units} running
                  </span>
                }
                chart={
                  <UnitGrid
                    statuses={unitsByStatus.map((e) => e.status.toLowerCase())}
                    label={`One square per unit: ${running} running, ${health.status_distribution.maintenance ?? 0} in maintenance, ${health.status_distribution.fault ?? 0} in fault`}
                  />
                }
              />
              <KpiCard
                label="Total operating hours"
                icon={<Clock className="w-4 h-4 text-blue-600" />}
                iconBg="bg-blue-50"
                value={`${health.total_operating_hours.toLocaleString()} h`}
                caption={
                  <span className="font-medium">
                    Avg {Math.round(health.avg_operating_hours).toLocaleString()} h / unit
                  </span>
                }
                chart={<SteppedBlueBars />}
              />
              <KpiCard
                label="Cumulative downtime"
                icon={<Hourglass className="w-4 h-4 text-amber-600" />}
                iconBg="bg-amber-50"
                value={
                  <>
                    {health.total_downtime_hours.toLocaleString()}
                    <span className="text-heading font-bold text-muted"> h</span>
                  </>
                }
                caption={
                  <span className="font-medium">
                    {periodDelta(health.total_downtime_hours, health.previous_downtime_hours, periodDays, "downtime") ?? `${repairs} repairs logged`}
                  </span>
                }
                chart={<SteppedAmberBars />}
              />
            </>
          )}
        </div>
      )}

      <AndonStrip equipment={equipmentList} selectedId={selectedMachineId} onSelect={onSelectMachine} filter={andonFilter} onFilterChange={setAndonFilter} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {health ? (
          <FleetHealthDonut distribution={health.status_distribution} totalUnits={health.total_units} selected={andonFilter} onSelect={setAndonFilter} />
        ) : loading ? (
          <div className={`${CARD} p-5 min-h-[280px]`} aria-hidden="true">
            <div className="skeleton h-4 w-28" />
            <div className="skeleton w-40 h-40 rounded-full mt-6 mx-auto" />
          </div>
        ) : null}
        {faults ? (
          <FaultDistributionChart
            categories={faults.fault_categories}
            incidents={faults.incident_breakdown}
            severities={faults.severity_distribution}
            periodLabel={shownPeriod}
            periodDelta={periodDelta(repairs, health?.previous_repairs_logged, periodDays, "repairs")}
          />
        ) : loading ? (
          <div className={`${CARD} p-5 min-h-[280px] space-y-4`} aria-hidden="true">
            <div className="skeleton h-4 w-28" />
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton h-3 w-full" />
            ))}
          </div>
        ) : null}
        <OperatingHoursBarChart equipment={equipmentList} selectedMachineId={selectedMachineId} onSelectEquipment={onSelectMachine} />
      </div>
    </div>
  );
}
