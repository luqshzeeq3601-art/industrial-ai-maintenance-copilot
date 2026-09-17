import { useEffect, useState } from "react";
import { FleetHealthDonut } from "./FleetHealthDonut";
import { OperatingHoursBarChart, type EquipmentData } from "./OperatingHoursBarChart";
import { FaultDistributionChart } from "./FaultDistributionChart";
import { HardDrive, Activity, Clock, ShieldCheck, RefreshCw } from "lucide-react";

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
  onSelectMachine: (machineId: string) => void;
}

export function AnalyticsDashboardView({
  apiBase,
  equipmentList,
  onSelectMachine
}: AnalyticsDashboardViewProps) {
  const [healthData, setHealthData] = useState<FleetHealthData | null>(null);
  const [faultData, setFaultData] = useState<FaultCategoriesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const handleRefresh = () => {
    setLoading(true);
    Promise.all([
      fetch(`${apiBase}/api/analytics/fleet-health`).then((r) => r.json()),
      fetch(`${apiBase}/api/analytics/fault-categories`).then((r) => r.json())
    ])
      .then(([health, faults]) => {
        setHealthData(health);
        setFaultData(faults);
      })
      .catch((err) => console.error("Error loading analytics data:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let ignore = false;
    Promise.all([
      fetch(`${apiBase}/api/analytics/fleet-health`).then((r) => r.json()),
      fetch(`${apiBase}/api/analytics/fault-categories`).then((r) => r.json())
    ])
      .then(([health, faults]) => {
        if (!ignore) {
          setHealthData(health);
          setFaultData(faults);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Error loading analytics data:", err);
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [apiBase]);

  // Filter equipment based on selected donut segment
  const filteredEquipment = statusFilter
    ? equipmentList.filter((e) => e.status.toLowerCase() === statusFilter.toLowerCase())
    : equipmentList;

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-[#FBFBFA]">
      {/* Top Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-[#111111] tracking-tight">
            Fleet Telemetry & Operational Analytics
          </h2>
          <p className="text-xs text-[#787774] font-mono mt-0.5">
            Real-time synchronization across SQLite work orders & machine registers
          </p>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#111111] bg-[#FFFFFF] border border-[#EAEAEA] rounded-md hover:bg-[#F7F6F3] active:scale-[0.98] transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* KPI Bento Grid */}
      {healthData && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 bg-[#FFFFFF] border border-[#EAEAEA] rounded-md shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-between text-[#787774] mb-1">
              <span className="text-[10.5px] uppercase tracking-wider font-semibold font-mono">
                Plant Availability
              </span>
              <Activity className="w-3.5 h-3.5 text-[#346538]" />
            </div>
            <p className="text-2xl font-bold text-[#111111] font-mono">
              {healthData.uptime_percentage}%
            </p>
            <p className="text-[11px] text-[#787774] mt-1 font-mono">
              {healthData.status_distribution.operational || 0} of {healthData.total_units} units running
            </p>
          </div>

          <div className="p-3.5 bg-[#FFFFFF] border border-[#EAEAEA] rounded-md shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-between text-[#787774] mb-1">
              <span className="text-[10.5px] uppercase tracking-wider font-semibold font-mono">
                Total Operating Hours
              </span>
              <Clock className="w-3.5 h-3.5 text-[#1F6C9F]" />
            </div>
            <p className="text-2xl font-bold text-[#111111] font-mono">
              {healthData.total_operating_hours.toLocaleString()}
            </p>
            <p className="text-[11px] text-[#787774] mt-1 font-mono">
              Avg {healthData.avg_operating_hours.toLocaleString()} hrs / unit
            </p>
          </div>

          <div className="p-3.5 bg-[#FFFFFF] border border-[#EAEAEA] rounded-md shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-between text-[#787774] mb-1">
              <span className="text-[10.5px] uppercase tracking-wider font-semibold font-mono">
                Logged Downtime
              </span>
              <HardDrive className="w-3.5 h-3.5 text-[#956400]" />
            </div>
            <p className="text-2xl font-bold text-[#111111] font-mono">
              {healthData.total_downtime_hours} hrs
            </p>
            <p className="text-[11px] text-[#787774] mt-1 font-mono">
              Across 560+ work orders
            </p>
          </div>

          <div className="p-3.5 bg-[#FFFFFF] border border-[#EAEAEA] rounded-md shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-between text-[#787774] mb-1">
              <span className="text-[10.5px] uppercase tracking-wider font-semibold font-mono">
                Safety & Guardrail
              </span>
              <ShieldCheck className="w-3.5 h-3.5 text-[#346538]" />
            </div>
            <p className="text-2xl font-bold text-[#346538] font-mono">
              Active
            </p>
            <p className="text-[11px] text-[#787774] mt-1 font-mono">
              Deterministic boundary enforced
            </p>
          </div>
        </div>
      )}

      {/* Row 1: Donut & Fault Category Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {healthData && (
          <FleetHealthDonut
            distribution={healthData.status_distribution}
            totalUnits={healthData.total_units}
            uptimePercentage={healthData.uptime_percentage}
            selectedStatus={statusFilter}
            onSelectStatus={setStatusFilter}
          />
        )}

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

      {/* Row 2: Comparative Operating Hours Bar Chart */}
      <div className="w-full">
        <OperatingHoursBarChart
          equipment={filteredEquipment}
          onSelectEquipment={onSelectMachine}
        />
      </div>
    </div>
  );
}
