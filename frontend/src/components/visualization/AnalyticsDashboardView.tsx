import { useCallback, useEffect, useState, type ReactNode } from "react";
import { CircleAlert, RefreshCw } from "lucide-react";
import { FleetHealthDonut } from "./FleetHealthDonut";
import { OperatingHoursBarChart, type EquipmentData } from "./OperatingHoursBarChart";
import { FaultDistributionChart } from "./FaultDistributionChart";
import { AndonStrip, type AndonFilter } from "./AndonStrip";
import { KpiIcon3D } from "./KpiIcon3D";
import { OVERHAUL_THRESHOLD } from "../workspace/types";

interface FleetHealthData {
  total_units: number;
  uptime_percentage: number;
  total_operating_hours: number;
  avg_operating_hours: number;
  total_downtime_hours: number;
  status_distribution: Record<string, number>;
  criticality_distribution: Record<string, number>;
}

interface FaultCategoriesData {
  fault_categories: Array<{ category: string; count: number }>;
  severity_distribution: Array<{ severity: string; count: number }>;
  incident_breakdown: Array<{
    category: string;
    occurrences: number;
    total_downtime_mins: number;
  }>;
}

interface AnalyticsDashboardViewProps {
  apiBase: string;
  equipmentList: EquipmentData[];
  selectedMachineId?: string;
  onSelectMachine: (machineId: string) => void;
}

const CARD = "bg-panel border border-line rounded-xl shadow-[var(--shadow-tinted-xs)]";
const STATUS_ORDER = ["operational", "maintenance", "fault"];
const STATUS_FILL: Record<string, string> = {
  operational: "bg-status-ok",
  maintenance: "bg-status-maint",
  fault: "bg-status-fault"
};

function fetchJson<T>(url: string): Promise<T> {
  return fetch(url).then((r) => {
    if (!r.ok) throw new Error(`${url.split("/").pop()} returned ${r.status}`);
    return r.json() as Promise<T>;
  });
}

interface KpiCardProps {
  label: string;
  value: ReactNode;
  caption: string;
  chart: ReactNode;
  icon: "availability" | "hours" | "downtime";
}

function KpiCard({ label, value, caption, chart, icon }: KpiCardProps) {
  return (
    <div className={`${CARD} @container p-4 flex items-center gap-3`}>
      <KpiIcon3D kind={icon} className="w-12 h-12 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-medium text-muted">{label}</p>
        <p className="mt-1.5 text-[28px] font-semibold text-ink tracking-tight tabular-nums leading-none whitespace-nowrap">{value}</p>
        <p className="mt-2 text-[13px] text-muted">{caption}</p>
      </div>
      <div className="hidden @min-[360px]:block shrink-0">{chart}</div>
    </div>
  );
}

/** Mini bar chart; heights are fractions of the tallest bar. */
function MiniBars({ values, fills, label }: { values: number[]; fills: string[]; label: string }) {
  const max = Math.max(1, ...values);
  return (
    <div className="flex items-end gap-[3px] h-12" role="img" aria-label={label}>
      {values.map((v, i) => (
        <span
          key={i}
          className={`w-[7px] rounded-t-[3px] rounded-b-[1px] ${fills[i]}`}
          style={{ height: `${Math.max(10, (v / max) * 100)}%` }}
        />
      ))}
    </div>
  );
}

/** One square per unit, coloured by live status. */
function UnitGrid({ statuses, label }: { statuses: string[]; label: string }) {
  return (
    <div className="grid grid-cols-7 gap-1" role="img" aria-label={label}>
      {statuses.map((st, i) => (
        <span key={i} className={`w-2.5 h-2.5 rounded-[3px] ${STATUS_FILL[st] ?? "bg-faint"}`} />
      ))}
    </div>
  );
}

function KpiSkeleton() {
  return (
    <div className={`${CARD} p-5`} aria-hidden="true">
      <div className="space-y-2.5">
        <div className="skeleton h-3.5 w-32" />
        <div className="skeleton h-7 w-28" />
        <div className="skeleton h-3 w-40" />
      </div>
    </div>
  );
}

export function AnalyticsDashboardView({
  apiBase,
  equipmentList,
  selectedMachineId,
  onSelectMachine
}: AnalyticsDashboardViewProps) {
  const [healthData, setHealthData] = useState<FleetHealthData | null>(null);
  const [faultData, setFaultData] = useState<FaultCategoriesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [andonFilter, setAndonFilter] = useState<AndonFilter>("all");

  const request = useCallback(
    () =>
      Promise.all([
        fetchJson<FleetHealthData>(`${apiBase}/api/analytics/fleet-health`),
        fetchJson<FaultCategoriesData>(`${apiBase}/api/analytics/fault-categories`)
      ]),
    [apiBase]
  );

  useEffect(() => {
    let ignore = false;
    request()
      .then(([health, faults]) => {
        if (ignore) return;
        setHealthData(health);
        setFaultData(faults);
        setUpdatedAt(new Date());
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (ignore) return;
        setError(err instanceof Error ? err.message : "Request failed");
        setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [request]);

  const refresh = () => {
    setLoading(true);
    setError(null);
    request()
      .then(([health, faults]) => {
        setHealthData(health);
        setFaultData(faults);
        setUpdatedAt(new Date());
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Request failed"))
      .finally(() => setLoading(false));
  };

  // Supporting charts use real series only: per-unit status, per-asset hours, downtime per fault category
  const unitsByStatus = [...equipmentList].sort(
    (a, b) => STATUS_ORDER.indexOf(a.status.toLowerCase()) - STATUS_ORDER.indexOf(b.status.toLowerCase())
  );
  const hoursAsc = [...equipmentList].sort((a, b) => a.operating_hours - b.operating_hours);
  const downtimeByCategory = [...(faultData?.incident_breakdown ?? [])].sort(
    (a, b) => a.total_downtime_mins - b.total_downtime_mins
  );
  const repairsLogged = (faultData?.incident_breakdown ?? []).reduce((sum, r) => sum + r.occurrences, 0);
  const running = healthData?.status_distribution.operational ?? 0;

  return (
    <div className="mx-auto w-full max-w-[1440px] px-1 sm:px-2 py-2 space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-[22px] font-semibold text-ink tracking-tight leading-tight">Dashboard</h1>
        <div className="flex items-center gap-3">
          {updatedAt && (
            <p className="text-[13px] text-muted" aria-live="polite">
              Updated {updatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="inline-flex items-center gap-2 min-h-[40px] pointer-coarse:min-h-[44px] px-3 rounded-md border border-line-strong bg-panel text-[13px] font-semibold text-body hover:bg-wash hover:text-ink disabled:opacity-60 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </header>

      {error && (
        <div role="alert" className="flex flex-wrap items-center gap-3 px-4 py-3 rounded-lg bg-danger-bg border border-danger-line">
          <CircleAlert className="w-5 h-5 shrink-0 text-danger" aria-hidden="true" />
          <p className="flex-1 min-w-[220px] text-[14px] text-danger-ink" title={error}>
            <strong className="font-semibold">Plant analytics didn't load.</strong> The maintenance service isn't responding.
          </p>
          <button
            type="button"
            onClick={refresh}
            className="min-h-[36px] px-4 rounded-md bg-panel border border-danger-line text-[13px] font-semibold text-danger-ink hover:bg-danger-bg cursor-pointer"
          >
            Try again
          </button>
        </div>
      )}

      {loading && !healthData ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4" role="status" aria-label="Loading plant analytics">
          <KpiSkeleton />
          <KpiSkeleton />
          <KpiSkeleton />
        </div>
      ) : (
        healthData && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KpiCard
              label="Plant availability"
              icon="availability"
              value={`${healthData.uptime_percentage}%`}
              caption={`${running} / ${healthData.total_units} running`}
              chart={
                <UnitGrid
                  statuses={unitsByStatus.map((e) => e.status.toLowerCase())}
                  label={`One square per unit: ${running} running, ${healthData.status_distribution.maintenance ?? 0} in maintenance, ${healthData.status_distribution.fault ?? 0} in fault`}
                />
              }
            />
            <KpiCard
              label="Total operating hours"
              icon="hours"
              value={
                <>
                  {healthData.total_operating_hours.toLocaleString()}
                  <span className="text-[18px] font-semibold text-muted"> h</span>
                </>
              }
              caption={`Avg ${Math.round(healthData.avg_operating_hours).toLocaleString()} h / unit`}
              chart={
                <MiniBars
                  values={hoursAsc.map((e) => e.operating_hours)}
                  fills={hoursAsc.map((e) => (e.operating_hours > OVERHAUL_THRESHOLD ? "bg-accent" : "bg-accent-line"))}
                  label="Operating hours per unit, lowest to highest; darker bars are past the service standard"
                />
              }
            />
            <KpiCard
              label="Cumulative downtime"
              icon="downtime"
              value={
                <>
                  {healthData.total_downtime_hours.toLocaleString()}
                  <span className="text-[18px] font-semibold text-muted"> h</span>
                </>
              }
              caption={repairsLogged ? `${repairsLogged.toLocaleString()} repairs logged` : "From logged repairs"}
              chart={
                <MiniBars
                  values={downtimeByCategory.map((r) => r.total_downtime_mins)}
                  fills={downtimeByCategory.map((_, i) => (i === downtimeByCategory.length - 1 ? "bg-status-maint" : "bg-warn-line"))}
                  label="Downtime by fault category, smallest to largest"
                />
              }
            />
          </div>
        )
      )}

      <AndonStrip
        equipment={equipmentList}
        selectedId={selectedMachineId}
        onSelect={onSelectMachine}
        filter={andonFilter}
        onFilterChange={setAndonFilter}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {healthData ? (
          <FleetHealthDonut
            distribution={healthData.status_distribution}
            totalUnits={healthData.total_units}
            selected={andonFilter}
            onSelect={setAndonFilter}
          />
        ) : loading ? (
          <div className={`${CARD} p-5 min-h-[280px]`} aria-hidden="true">
            <div className="skeleton h-4 w-28" />
            <div className="skeleton w-40 h-40 rounded-full mt-6 mx-auto" />
          </div>
        ) : null}
        {faultData ? (
          <FaultDistributionChart
            categories={faultData.fault_categories}
            incidents={faultData.incident_breakdown}
            severities={faultData.severity_distribution}
          />
        ) : loading ? (
          <div className={`${CARD} p-5 min-h-[280px] space-y-4`} aria-hidden="true">
            <div className="skeleton h-4 w-28" />
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton h-3 w-full" />
            ))}
          </div>
        ) : null}
        <OperatingHoursBarChart
          equipment={equipmentList}
          selectedMachineId={selectedMachineId}
          onSelectEquipment={onSelectMachine}
        />
      </div>
    </div>
  );
}
