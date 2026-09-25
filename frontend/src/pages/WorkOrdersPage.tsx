import { useEffect, useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { ClipboardList, Plus } from "lucide-react";
import { useEquipment, usePendingActions, useWorkOrders } from "../api/queries";
import type { WorkOrderStatus } from "../api/models";
import { useSessionContext } from "../app/sessionContext";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { ResetButton, SearchInput, SelectFilter } from "../components/ui/Filters";
import { PageHeader } from "../components/ui/PageHeader";
import { Pagination } from "../components/ui/Pagination";
import { EmptyState } from "../components/ui/States";
import { Tabs } from "../components/ui/Tabs";
import { CopilotRequests } from "../components/workorders/CopilotRequests";
import { CreateWorkOrderDialog } from "../components/workorders/CreateWorkOrderDialog";
import { WorkOrderDrawer } from "../components/workorders/WorkOrderDrawer";
import { WorkOrderTable } from "../components/workorders/WorkOrderTable";
import { useUrlFilters } from "../hooks/useUrlFilters";
import { PRIORITY, WORK_ORDER_TABS, type WorkOrderTab } from "../lib/status";

const FILTER_KEYS = ["status", "q", "machine_id", "priority", "sort", "order"] as const;
const PAGE_SIZE = 12;

export default function WorkOrdersPage() {
  const { workOrderId } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { isApprover } = useSessionContext();
  const pendingActions = usePendingActions(isApprover);
  const { values, set, reset, page } = useUrlFilters(FILTER_KEYS);
  const equipment = useEquipment();
  const assets = useMemo(() => equipment.data?.equipment ?? [], [equipment.data]);

  const tabIds: WorkOrderTab[] = ["all", "open", "in_progress", "closed", ...(isApprover ? (["approval"] as const) : [])];
  const tab: WorkOrderTab = tabIds.includes(values.status as WorkOrderTab) ? (values.status as WorkOrderTab) : "all";
  const statuses = WORK_ORDER_TABS[tab].statuses as WorkOrderStatus[] | undefined;
  const sort = (values.sort || "created_at") as "created_at" | "due_date" | "priority" | "work_order_id";
  const order = values.order === "asc" ? "asc" : "desc";

  const orders = useWorkOrders({
    statuses,
    q: values.q || undefined,
    machine_id: values.machine_id || undefined,
    priority: values.priority || undefined,
    sort,
    order,
    page,
    page_size: PAGE_SIZE
  });
  const counts = orders.data?.status_counts ?? {};
  const count = (t: WorkOrderTab) => (WORK_ORDER_TABS[t].statuses ?? []).reduce((n, s) => n + (counts[s as WorkOrderStatus] ?? 0), 0);

  const creatingFor = params.get("new");
  const closeCreate = () =>
    setParams(
      (p) => {
        const next = new URLSearchParams(p);
        next.delete("new");
        return next;
      },
      { replace: true }
    );

  useEffect(() => {
    document.title = "Work orders · Maintenance Copilot";
  }, []);

  const filtering = !!(values.q || values.machine_id || values.priority);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Work orders"
        actions={
          <Button variant="primary" icon={Plus} onClick={() => setParams((p) => ({ ...Object.fromEntries(p), new: "" }), { replace: true })}>
            Create work order
          </Button>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-line">
          <Tabs
            label="Work order status"
            idBase="wo"
            variant="segmented"
            items={tabIds.map((id) => ({ id, label: WORK_ORDER_TABS[id].label, count: id === "approval" ? count("approval") + (pendingActions.data?.length ?? 0) : undefined }))}
            value={tab}
            onChange={(id) => set({ status: id === "all" ? null : id })}
            className="flex-[1_1_auto]"
          />
          <div className="flex flex-[1_1_520px] flex-wrap gap-3">
            <SearchInput label="Search work orders" placeholder="Search work orders…" value={values.q} onChange={(q) => set({ q })} className="flex-[2_1_200px]" />
            <SelectFilter
              label="Asset"
              allLabel="All assets"
              value={values.machine_id}
              onChange={(machine_id) => set({ machine_id })}
              options={assets.map((a) => ({ value: a.machine_id, label: `${a.machine_id} · ${a.name}` }))}
              className="flex-[1_1_160px]"
            />
            <SelectFilter
              label="Priority"
              allLabel="All priorities"
              value={values.priority}
              onChange={(priority) => set({ priority })}
              options={(["critical", "high", "medium", "low"] as const).map((p) => ({ value: p, label: PRIORITY[p].label }))}
              className="flex-[1_1_140px]"
            />
            {filtering && <ResetButton onClick={() => set({ q: null, machine_id: null, priority: null })} />}
          </div>
        </div>
        <div role="tabpanel" id="wo-panel" aria-labelledby={`wo-tab-${tab}`}>
          {tab === "approval" && <CopilotRequests />}
          <WorkOrderTable
            rows={orders.data?.work_orders}
            isLoading={orders.isLoading}
            error={orders.error}
            onRetry={() => void orders.refetch()}
            sort={{ key: sort, order }}
            onSortChange={(s) => set({ sort: s.key, order: s.order })}
            empty={
              <EmptyState
                icon={ClipboardList}
                title={filtering ? "No work orders match these filters" : tab === "approval" ? "Nothing waiting for approval" : "No work orders here yet"}
                message={filtering ? "Clear a filter or try a different search." : tab === "approval" ? "Work orders created by technicians appear here for your decision." : "Create a work order to plan maintenance on an asset."}
                action={filtering ? <ResetButton onClick={reset} label="Clear filters" /> : undefined}
              />
            }
          />
          {orders.data && orders.data.total > 0 && (
            <Pagination page={page} pageSize={PAGE_SIZE} total={orders.data.total} onPageChange={(p) => set({ page: p })} noun="work orders" />
          )}
        </div>
      </Card>

      <CreateWorkOrderDialog
        open={creatingFor !== null}
        onClose={closeCreate}
        equipment={assets}
        initialAsset={creatingFor || undefined}
        onCreated={(id) => navigate(`/work-orders/${id}`, { replace: true })}
      />
      <WorkOrderDrawer id={workOrderId} onClose={() => navigate({ pathname: "/work-orders", search: window.location.search })} />
    </div>
  );
}
