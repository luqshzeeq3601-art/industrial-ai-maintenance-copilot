import { Link, useNavigate } from "react-router";
import { ClipboardList } from "lucide-react";
import type { WorkOrder } from "../../api/models";
import { cn } from "../../lib/cn";
import { formatDate, isOverdue } from "../../lib/format";
import { WORK_ORDER_STATUS } from "../../lib/status";
import { DataTable, type Column, type SortState } from "../ui/DataTable";
import { EmptyState } from "../ui/States";
import { PriorityTag, StatusLabel } from "../ui/StatusLabel";

interface WorkOrderTableProps {
  rows: WorkOrder[] | undefined;
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
  sort?: SortState;
  onSortChange?: (sort: SortState) => void;
  empty?: React.ReactNode;
  showAsset?: boolean;
}

const OPEN = new Set(["pending", "approved", "in_progress"]);

export function DueDate({ order }: { order: Pick<WorkOrder, "due_date" | "status"> }) {
  const overdue = OPEN.has(order.status) && isOverdue(order.due_date);
  if (!order.due_date) return <span className="text-body">—</span>;
  return (
    <span className={cn("font-data whitespace-nowrap", overdue ? "text-danger font-semibold" : "text-ink")}>
      {formatDate(order.due_date)}
      {overdue && <span className="block text-label font-sans font-semibold">Overdue</span>}
    </span>
  );
}

/** Work orders; ID in mono, priority as a restrained tag, status readable without color, overdue due dates in danger ink. */
export function WorkOrderTable({ rows, isLoading, error, onRetry, sort, onSortChange, empty, showAsset = true }: WorkOrderTableProps) {
  const navigate = useNavigate();
  const columns: Column<WorkOrder>[] = [
    {
      key: "id",
      header: "Work order ID",
      sortKey: "work_order_id",
      cell: (w) => (
        <Link to={`/work-orders/${w.work_order_id}`} onClick={(e) => e.stopPropagation()} className="font-data font-semibold text-ink hover:underline underline-offset-2 whitespace-nowrap">
          {w.work_order_id}
        </Link>
      )
    },
    ...(showAsset
      ? [
          {
            key: "asset",
            header: "Asset",
            cell: (w: WorkOrder) => (
              <span className="whitespace-nowrap">
                <span className="font-data">{w.machine_id}</span> {w.machine_name && <span className="text-body">{w.machine_name}</span>}
              </span>
            )
          }
        ]
      : []),
    { key: "title", header: "Title", cell: (w) => <span className="block min-w-[200px]">{w.title}</span> },
    { key: "priority", header: "Priority", sortKey: "priority", cell: (w) => <PriorityTag priority={w.priority} /> },
    { key: "status", header: "Status", cell: (w) => <StatusLabel meta={WORK_ORDER_STATUS[w.status]} /> },
    { key: "assignee", header: "Assignee", cell: (w) => <span className="whitespace-nowrap">{w.assigned_to ?? <span className="text-body">Unassigned</span>}</span> },
    { key: "due", header: "Due date", sortKey: "due_date", cell: (w) => <DueDate order={w} /> }
  ];

  return (
    <DataTable
      caption="Work orders"
      columns={columns}
      rows={rows}
      rowKey={(w) => w.work_order_id}
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
      sort={sort}
      onSortChange={onSortChange}
      onRowClick={(w) => navigate(`/work-orders/${w.work_order_id}${window.location.search}`)}
      empty={empty ?? <EmptyState icon={ClipboardList} title="No work orders" message="Work orders for this asset appear here once they are created." />}
    />
  );
}
