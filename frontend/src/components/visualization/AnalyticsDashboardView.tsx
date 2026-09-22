import { useEffect, useState } from "react";
import { FleetHealthDonut } from "./FleetHealthDonut";
import { OperatingHoursBarChart, type EquipmentData } from "./OperatingHoursBarChart";
import { FaultDistributionChart } from "./FaultDistributionChart";
import { AndonStrip } from "./AndonStrip";
import {
  Activity,
  CircleAlert,
  Clock,
  Timer,
  RefreshCw,
  ShieldCheck,
  RotateCcw
} from "lucide-react";

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

function StatSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-12 gap-4" aria-hidden="true">
      <div className="col-span-2 lg:col-span-5 p-5 bg-[#FFFFFF] border border-[#DFE6ED] rounded-[var(--radius-outer)]">
        <div className="skeleton h-3 w-32" />
        <div className="skeleton h-10 w-40 mt-3" />
      </div>
      <div className="p-5 bg-[#FFFFFF] border border-[#DFE6ED] rounded-[var(--radius-outer)] lg:col-span-4">
        <div className="skeleton h-3 w-28" />
        <div className="skeleton h-7 w-32 mt-3" />
      </div>
      <div className="p-5 bg-[#FFFFFF] border border-[#DFE6ED] rounded-[var(--radius-outer)] lg:col-span-3">
        <div className="skeleton h-3 w-24" />
        <div className="skeleton h-7 w-24 mt-3" />
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
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      fetch(`${apiBase}/api/analytics/fleet-health`).then((r) => {
        if (!r.ok) throw new Error(`fleet-health ${r.status}`);
        return r.json();
      }),
      fetch(`${apiBase}/api/analytics/fault-categories`).then((r) => {
        if (!r.ok) throw new Error(`fault-categories ${r.status}`);
        return r.json();
      })
    ])
      .then(([health, faults]) => {
        setHealthData(health);
        setFaultData(faults);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load analytics");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let ignore = false;
    Promise.all([
      fetch(`${apiBase}/api/analytics/fleet-health`).then((r) => {
        if (!r.ok) throw new Error(`fleet-health ${r.status}`);
        return r.json();
      }),
      fetch(`${apiBase}/api/analytics/fault-categories`).then((r) => {
        if (!r.ok) throw new Error(`fault-categories ${r.status}`);
        return r.json();
      })
    ])
      .then(([health, faults]) => {
        if (!ignore) {
          setHealthData(health);
          setFaultData(faults);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Failed to load analytics");
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [apiBase]);

  // Filter equipment based on selected donut segment
  const filteredEquipment = statusFilter
    ? equipmentList.filter((e) => e.status.toLowerCase() === statusFilter.toLowerCase())
    : equipmentList;

  const hasActiveFilters = Boolean(statusFilter || categoryFilter);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 custom-scrollbar">
      <div className="mx-auto w-full max-w-[1100px] space-y-5">
        {/* Logbook masthead */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.08em] font-semibold font-mono text-[#64748B]">
              Plant Telemetry & Operational Health
            </p>
            <h2 className="text-[24px] leading-tight font-bold tracking-tight text-[#16202B] mt-0.5">
              Fleet Operations & Reliability Analytics
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter(null);
                  setCategoryFilter(null);
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-[#D92D20] bg-[#FFF5F5] border border-[#F3C2BD] rounded-lg hover:bg-[#FCECEA] transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear Filters</span>
              </button>
            )}

            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-[#16202B] bg-[#FFFFFF] border border-[#DFE6ED] rounded-lg hover:bg-[#F4F6F9] hover:border-[#CBD5E1] active:scale-[0.98] transition-all shadow-[0_1px_2px_rgba(22,32,43,0.04)] disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#1B2A3A] ${loading ? "animate-spin" : ""}`} />
              <span>Refresh Telemetry</span>
            </button>
          </div>
        </div>

        {error && (
          <div role="alert" className="flex items-start gap-2.5 p-3.5 rounded-xl bg-[#FDEBEC] border border-[#F3C2BD]">
            <CircleAlert className="w-4 h-4 shrink-0 mt-0.5 text-[#9F2F2D]" strokeWidth={2.2} />
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-[#9F2F2D]">Analytics feed offline</p>
              <p className="text-[12.5px] text-[#7A3A38] mt-0.5 font-mono">{error}</p>
              <button
                type="button"
                onClick={load}
                className="mt-2 text-[12px] font-bold text-[#9F2F2D] underline hover:no-underline cursor-pointer"
              >
                Retry connection
              </button>
            </div>
          </div>
        )}

        {/* KPI Metrics Row */}
        {loading && !healthData ? (
          <StatSkeleton />
        ) : (
          healthData && (
            <div className="grid grid-cols-2 lg:grid-cols-12 gap-4">
              {/* Availability KPI */}
              <div className="col-span-2 lg:col-span-5 p-5 bg-[#1B2A3A] text-white rounded-[var(--radius-outer)] shadow-[0_2px_8px_rgba(27,42,58,0.12)] border-t-2 border-[#38BDF8]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] uppercase tracking-[0.08em] font-semibold font-mono text-white/70">
                    Plant Availability (Uptime)
                  </span>
                  <Activity className="w-4 h-4 text-[#38BDF8]" />
                </div>
                <p className="text-[2.6rem] leading-none font-bold font-mono tabular-nums tracking-tight">
                  {healthData.uptime_percentage}%
                </p>
                <div className="flex items-center gap-2 mt-2.5 text-[11.5px] text-white/70 font-mono">
                  <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
                  <span>
                    {healthData.status_distribution.operational || 0} of {healthData.total_units} units running nominal
                  </span>
                </div>
              </div>

              {/* Operating Hours KPI */}
              <div className="p-5 bg-[#FFFFFF] border border-[#DFE6ED] rounded-[var(--radius-outer)] shadow-[0_1px_3px_rgba(22,32,43,0.04)] lg:col-span-4 border-t-2 border-[#1F6C9F]">
                <div className="flex items-center justify-between text-[#64748B] mb-2">
                  <span className="text-[11px] uppercase tracking-[0.08em] font-semibold font-mono">
                    Total Operating Hours
                  </span>
                  <Clock className="w-4 h-4 text-[#1F6C9F]" />
                </div>
                <p className="text-2xl font-bold text-[#16202B] font-mono tabular-nums tracking-tight">
                  {healthData.total_operating_hours.toLocaleString()} <span className="text-sm font-normal text-[#64748B]">hrs</span>
                </p>
                <p className="text-[11.5px] text-[#64748B] mt-1.5 font-mono">
                  Fleet average: {healthData.avg_operating_hours.toLocaleString()} hrs/unit
                </p>
              </div>

              {/* Logged Downtime KPI */}
              <div className="p-5 bg-[#FFFFFF] border border-[#DFE6ED] rounded-[var(--radius-outer)] shadow-[0_1px_3px_rgba(22,32,43,0.04)] lg:col-span-3 border-t-2 border-[#D97706]">
                <div className="flex items-center justify-between text-[#64748B] mb-2">
                  <span className="text-[11px] uppercase tracking-[0.08em] font-semibold font-mono">
                    Cumulative Downtime
                  </span>
                  <Timer className="w-4 h-4 text-[#D97706]" />
                </div>
                <p className="text-2xl font-bold text-[#16202B] font-mono tabular-nums tracking-tight">
                  {healthData.total_downtime_hours} <span className="text-sm font-normal text-[#64748B]">hrs</span>
                </p>
                <p className="text-[11.5px] text-[#64748B] mt-1.5 font-mono">
                  Indexed across 560+ work logs
                </p>
              </div>

              {/* Guardrail Status Banner */}
              <div className="col-span-2 lg:col-span-12 px-4 py-3 bg-[#EDF3EC] border border-[#346538]/20 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 text-[#346538]">
                  <ShieldCheck className="w-4 h-4 text-[#346538]" />
                  <span className="text-xs font-bold font-mono">Safety Guardrail Active</span>
                  <span className="text-[11px] text-[#346538]/70 hidden sm:inline">|</span>
                  <span className="text-[11.5px] text-[#346538]/90 hidden sm:inline">
                    Deterministic abstention & LOTO verification rules enforced
                  </span>
                </div>
                <span className="text-[11px] font-bold text-[#346538] font-mono uppercase tracking-wider bg-white/60 px-2 py-0.5 rounded">
                  ISO-13849 Compliant
                </span>
              </div>
            </div>
          )
        )}

        {/* Shop Floor Andon Board */}
        <div className="p-4 bg-[#FFFFFF] border border-[#DFE6ED] rounded-[var(--radius-outer)] shadow-[0_1px_3px_rgba(22,32,43,0.04)]">
          <AndonStrip equipment={equipmentList} selectedId={selectedMachineId} onSelect={onSelectMachine} />
        </div>

        {/* Charts Row: Health record left, fault ledger right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-5">
            {healthData && (
              <FleetHealthDonut
                distribution={healthData.status_distribution}
                totalUnits={healthData.total_units}
                uptimePercentage={healthData.uptime_percentage}
                selectedStatus={statusFilter}
                onSelectStatus={setStatusFilter}
              />
            )}
          </div>

          <div className="lg:col-span-7">
            {faultData && (
              <FaultDistributionChart
                categories={faultData.fault_categories}
                incidents={faultData.incident_breakdown}
                severities={faultData.severity_distribution}
                selectedCategory={categoryFilter}
                onSelectCategory={setCategoryFilter}
              />
            )}
          </div>
        </div>

        {/* Full-width hours ledger */}
        <div className="w-full">
          <OperatingHoursBarChart equipment={filteredEquipment} onSelectEquipment={onSelectMachine} />
        </div>
      </div>
    </div>
  );
}
