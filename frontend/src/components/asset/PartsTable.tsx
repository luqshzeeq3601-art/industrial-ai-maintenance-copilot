import { Package } from "lucide-react";
import type { MaintenanceLog } from "../../api/models";
import { formatDate } from "../../lib/format";
import { DataTable, type Column } from "../ui/DataTable";
import { EmptyState } from "../ui/States";

/** Parts replaced on this asset, from completed maintenance records. */
export function PartsTable({ logs, isLoading, error, onRetry }: { logs: MaintenanceLog[] | undefined; isLoading: boolean; error: Error | null; onRetry: () => void }) {
  const rows = logs?.filter((l) => l.parts_replaced && l.parts_replaced.trim() && l.parts_replaced.toLowerCase() !== "none");
  const columns: Column<MaintenanceLog>[] = [
    { key: "date", header: "Replaced", cell: (l) => <span className="font-data whitespace-nowrap">{formatDate(l.completed_at)}</span> },
    { key: "parts", header: "Parts", cell: (l) => <span className="block min-w-[200px] font-medium">{l.parts_replaced}</span> },
    { key: "work", header: "Work done", cell: (l) => <span className="block min-w-[220px] text-body">{l.action_taken}</span> },
    { key: "fault", header: "Fault code", cell: (l) => <span className="font-data">{l.fault_code ?? "—"}</span> },
    { key: "tech", header: "Technician", cell: (l) => <span className="whitespace-nowrap">{l.technician}</span> }
  ];
  return (
    <DataTable
      caption="Parts replaced"
      columns={columns}
      rows={rows}
      rowKey={(l) => String(l.id)}
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
      skeletonRows={5}
      empty={<EmptyState icon={Package} title="No parts replaced" message="Parts recorded on completed maintenance for this asset appear here." />}
    />
  );
}
