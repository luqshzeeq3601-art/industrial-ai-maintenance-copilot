import { useEffect } from "react";
import { useSearchParams } from "react-router";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import { Activity, ClipboardList, Clock, RotateCw, TriangleAlert } from "lucide-react";
import { useEquipment, useFaultCategories, useFleetHealth, useHistory } from "../api/queries";
import { AndonBoard } from "../components/dashboard/AndonBoard";
import { FleetHealthCard } from "../components/dashboard/FleetHealthCard";
import { RecentActivityCard } from "../components/dashboard/RecentActivityCard";
import { RepairsByFaultCard } from "../components/dashboard/RepairsByFaultCard";
import { Button } from "../components/ui/Button";
import { KpiTile } from "../components/ui/KpiTile";
import { PageHeader } from "../components/ui/PageHeader";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { formatNumber, formatTime } from "../lib/format";

const RANGES = [
  { id: "30d", label: "30 days", days: 30 },
  { id: "90d", label: "90 days", days: 90 },
  { id: "12m", label: "12 months", days: 365 },
  { id: "all", label: "All time", days: null }
] as const;
type RangeId = (typeof RANGES)[number]["id"];

export default function DashboardPage() {
  const [params, setParams] = useSearchParams();
  const range = RANGES.find((r) => r.id === params.get("range")) ?? RANGES[0];
  const periodLabel = range.days ? `last ${range.label}` : "all time";
  const previousLabel = range.days ? `previous ${range.label}` : "";

  const equipment = useEquipment();
  const health = useFleetHealth(range.days);
  const faults = useFaultCategories(range.days);
  const activity = useHistory({ page_size: 5 });
  const queryClient = useQueryClient();
  const fetching = useIsFetching() > 0;

  useEffect(() => {
    document.title = "Dashboard · Maintenance Copilot";
  }, []);

  const h = health.data;
  const assets = equipment.data?.equipment;
  const running = h?.status_distribution.operational ?? 0;
  const downtimeDelta =
    h && h.previous_downtime_hours != null ? { value: h.total_downtime_hours - h.previous_downtime_hours, unit: " h", higherIsBetter: false, period: previousLabel } : null;
  const updatedAt = health.dataUpdatedAt ? formatTime(new Date(health.dataUpdatedAt)) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        actions={
          <>
            <SegmentedControl
              label="Time range"
              options={RANGES.map((r) => ({ id: r.id, label: r.label }))}
              value={range.id}
              onChange={(id: RangeId) => setParams(id === "30d" ? {} : { range: id }, { replace: true })}
            />
            <Button icon={RotateCw} loading={fetching} onClick={() => void queryClient.invalidateQueries()}>
              Refresh
            </Button>
          </>
        }
      />
      {updatedAt && (
        <p className="-mt-4 text-meta text-body">
          Updated <time className="font-data">{updatedAt}</time>
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 wide:grid-cols-4">
        <KpiTile
          icon={Activity}
          label="Plant availability"
          loading={health.isLoading}
          value={h ? `${formatNumber(h.uptime_percentage, 1)}%` : "—"}
          context={h ? `${running} of ${h.total_units} assets running now` : undefined}
        />
        <KpiTile
          icon={Clock}
          label="Operating hours"
          loading={health.isLoading}
          value={h ? `${formatNumber(h.total_operating_hours)} h` : "—"}
          context={h ? `Lifetime, across ${h.total_units} assets` : undefined}
        />
        <KpiTile
          icon={TriangleAlert}
          tone="warn"
          label="Cumulative downtime"
          loading={health.isLoading}
          value={h ? `${formatNumber(h.total_downtime_hours, 1)} h` : "—"}
          delta={downtimeDelta}
          context={h ? `${h.repairs_logged} repairs, ${periodLabel}` : undefined}
          trend={h && h.daily_downtime_hours.length > 1 ? <DowntimeBars days={h.daily_downtime_hours} /> : undefined}
        />
        <KpiTile
          icon={ClipboardList}
          label="Active work orders"
          loading={health.isLoading}
          value={h ? formatNumber(h.active_work_orders) : "—"}
          context="Awaiting approval, open, or in progress"
        />
      </div>

      <AndonBoard equipment={assets} isLoading={equipment.isLoading} error={equipment.error} onRetry={() => void equipment.refetch()} />

      <div className="grid gap-4 lg:grid-cols-2 wide:grid-cols-3">
        <FleetHealthCard data={h} isLoading={health.isLoading} error={health.error} onRetry={() => void health.refetch()} />
        <RepairsByFaultCard
          data={faults.data}
          periodLabel={periodLabel}
          isLoading={faults.isLoading}
          error={faults.error}
          onRetry={() => void faults.refetch()}
        />
        <div className="lg:col-span-2 wide:col-span-1">
          <RecentActivityCard data={activity.data} isLoading={activity.isLoading} error={activity.error} onRetry={() => void activity.refetch()} />
        </div>
      </div>
    </div>
  );
}

/** Daily downtime in the period as tiny bars; the tile's value and delta carry the numbers. */
function DowntimeBars({ days }: { days: { day: string; hours: number }[] }) {
  const recent = days.slice(-20);
  const max = Math.max(...recent.map((d) => d.hours), 0.1);
  return (
    <svg width={64} height={32} viewBox="0 0 64 32" className="shrink-0" role="img" aria-label={`Daily downtime, ${recent.length} days with repairs`}>
      {recent.map((d, i) => {
        const w = 64 / recent.length;
        const hgt = Math.max(2, (d.hours / max) * 30);
        return <rect key={d.day} x={i * w + 0.5} y={32 - hgt} width={Math.max(w - 1.5, 1)} height={hgt} rx={1} fill="var(--color-status-maint)" />;
      })}
    </svg>
  );
}
