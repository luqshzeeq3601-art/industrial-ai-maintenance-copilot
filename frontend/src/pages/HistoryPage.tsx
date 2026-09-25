import { useEffect, useMemo } from "react";
import { Calendar, History as HistoryIcon } from "lucide-react";
import { useEquipment, useHistory } from "../api/queries";
import type { HistoryType } from "../api/models";
import { EVENT_META } from "../components/history/eventMeta";
import { HistoryTable } from "../components/history/HistoryTable";
import { Card } from "../components/ui/Card";
import { ResetButton, SelectFilter } from "../components/ui/Filters";
import { PageHeader } from "../components/ui/PageHeader";
import { Pagination } from "../components/ui/Pagination";
import { EmptyState } from "../components/ui/States";
import { useUrlFilters } from "../hooks/useUrlFilters";
import { isoDay } from "../lib/format";

const FILTER_KEYS = ["range", "type", "machine_id", "user"] as const;
const PAGE_SIZE = 20;
const RANGES = [
  { value: "1", label: "Last 24 hours", days: 1 },
  { value: "7", label: "Last 7 days", days: 7 },
  { value: "30", label: "Last 30 days", days: 30 },
  { value: "90", label: "Last 90 days", days: 90 },
  { value: "all", label: "All time", days: null }
];

export default function HistoryPage() {
  const { values, set, reset, page } = useUrlFilters(FILTER_KEYS);
  const equipment = useEquipment();
  const range = RANGES.find((r) => r.value === values.range) ?? RANGES[2]!;
  const history = useHistory({
    from: range.days ? isoDay(range.days) : undefined,
    type: (values.type || undefined) as HistoryType | undefined,
    machine_id: values.machine_id || undefined,
    user: values.user || undefined,
    page,
    page_size: PAGE_SIZE
  });

  useEffect(() => {
    document.title = "History · Maintenance Copilot";
  }, []);

  const assetOptions = useMemo(
    () => (equipment.data?.equipment ?? []).map((e) => ({ value: e.machine_id, label: `${e.machine_id} · ${e.name}` })),
    [equipment.data]
  );
  const filtering = !!(values.range || values.type || values.machine_id || values.user);

  return (
    <div className="space-y-5">
      <PageHeader title="History" subtitle="Alarms, diagnostics, work orders, maintenance, approvals, SOP views, and settings changes." />
      <Card>
        <div className="grid gap-3 p-4 border-b border-line sm:grid-cols-2 xl:grid-cols-[repeat(4,minmax(0,1fr))_auto] xl:items-end">
          <SelectFilter
            visibleLabel
            label="Time range"
            icon={<Calendar className="w-4 h-4" aria-hidden="true" />}
            value={range.value}
            onChange={(v) => set({ range: v === "30" ? null : v })}
            options={RANGES.map((r) => ({ value: r.value, label: r.label }))}
          />
          <SelectFilter
            visibleLabel
            label="Type"
            allLabel="All types"
            value={values.type}
            onChange={(type) => set({ type })}
            options={Object.entries(EVENT_META).map(([value, m]) => ({ value, label: m.label }))}
          />
          <SelectFilter visibleLabel label="Asset" allLabel="All assets" value={values.machine_id} onChange={(machine_id) => set({ machine_id })} options={assetOptions} />
          <SelectFilter
            visibleLabel
            label="User"
            allLabel="All users"
            value={values.user}
            onChange={(user) => set({ user })}
            options={(history.data?.users ?? []).map((u) => ({ value: u, label: u }))}
          />
          <ResetButton onClick={reset} disabled={!filtering} />
        </div>
        <HistoryTable
          events={history.data?.events}
          isLoading={history.isLoading}
          error={history.error}
          onRetry={() => void history.refetch()}
          empty={
            <EmptyState
              icon={HistoryIcon}
              title={filtering ? "No events match these filters" : "No events recorded yet"}
              message={filtering ? "Widen the time range or clear a filter." : "Alarms, work orders, and maintenance appear here as they happen."}
              action={filtering ? <ResetButton onClick={reset} label="Clear filters" /> : undefined}
            />
          }
        />
        {history.data && history.data.total > 0 && (
          <Pagination page={page} pageSize={PAGE_SIZE} total={history.data.total} onPageChange={(p) => set({ page: p })} noun="events" />
        )}
      </Card>
    </div>
  );
}
