import { useEffect, useMemo } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router";
import { ArrowLeft } from "lucide-react";
import { useAlarms, useAsset, useHistory, useMaintenanceHistory, useSops, useWorkOrders } from "../api/queries";
import type { Sop } from "../api/models";
import { useCopilot } from "../app/copilotContext";
import { AlarmTable } from "../components/alarms/AlarmTable";
import { AlarmBanner } from "../components/asset/AlarmBanner";
import { AssetDetailHeader } from "../components/asset/AssetDetailHeader";
import { AssetKpis } from "../components/asset/AssetKpis";
import { AssetOverview } from "../components/asset/AssetOverview";
import { PartsTable } from "../components/asset/PartsTable";
import { HistoryTable } from "../components/history/HistoryTable";
import { SopTable } from "../components/sops/SopTable";
import { Card } from "../components/ui/Card";
import { ErrorState } from "../components/ui/States";
import { TabPanel, Tabs } from "../components/ui/Tabs";
import { WorkOrderTable } from "../components/workorders/WorkOrderTable";
import { PageSkeleton } from "../components/shell/PageSkeleton";
import { assetCondition, topAlarm } from "../lib/condition";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "diagnostics", label: "Diagnostics" },
  { id: "sops", label: "SOPs" },
  { id: "work-orders", label: "Work orders" },
  { id: "history", label: "History" },
  { id: "parts", label: "Parts" }
] as const;
type TabId = (typeof TABS)[number]["id"];

export default function AssetDetailPage() {
  const { assetId = "", tab } = useParams();
  const navigate = useNavigate();
  const { chat, openDocument } = useCopilot();
  const asset = useAsset(assetId);
  const alarms = useAlarms({ machine_id: assetId });
  const active = useMemo(() => (alarms.data ?? []).filter((a) => a.status === "active"), [alarms.data]);
  const sopsByName = useSops({ asset: asset.data?.name });
  const sopsById = useSops({ asset: assetId });
  const current = (TABS.find((t) => t.id === tab)?.id ?? "overview") as TabId;

  useEffect(() => {
    if (asset.data) document.title = `${asset.data.name} · Maintenance Copilot`;
  }, [asset.data]);

  const sops = useMemo(() => {
    const merged = new Map<string, Sop>();
    [...(sopsByName.data ?? []), ...(sopsById.data ?? [])].forEach((s) => merged.set(s.id, s));
    return sopsByName.data || sopsById.data ? [...merged.values()] : undefined;
  }, [sopsByName.data, sopsById.data]);

  if (tab && !TABS.some((t) => t.id === tab)) return <Navigate to={`/assets/${assetId}`} replace />;
  if (asset.isLoading) return <PageSkeleton />;
  if (asset.error || !asset.data) {
    const missing = asset.error && "status" in asset.error && asset.error.status === 404;
    return (
      <Card>
        <ErrorState
          title={missing ? `Asset ${assetId} doesn't exist` : "This asset didn't load"}
          message={missing ? "Check the ID, or pick the asset from the asset list." : asset.error?.message}
          onRetry={missing ? undefined : () => void asset.refetch()}
        />
        {missing && (
          <p className="pb-10 text-center">
            <Link to="/assets" className="text-small font-semibold text-accent">
              Go to assets
            </Link>
          </p>
        )}
      </Card>
    );
  }

  const a = asset.data;
  const { condition, reason } = assetCondition(a, active);
  const alarm = topAlarm(active);
  const ask = (q: string) => {
    void chat.send(q);
    navigate("/assets");
  };
  const firstSop = sops?.[0];
  const openSop = (s: Sop) => openDocument({ document: s.file, doc_type: "sop" });

  return (
    <div className="space-y-5">
      <Link to="/assets" className="inline-flex items-center gap-2 h-10 text-small font-medium text-body hover:text-ink">
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        Back to assets
      </Link>
      <AssetDetailHeader asset={a} onAsk={ask} onOpenSop={firstSop ? () => openSop(firstSop) : undefined} />
      <AssetKpis asset={a} condition={condition} reason={reason} />
      {alarm && <AlarmBanner alarm={alarm} extra={active.length - 1} />}

      <div>
        <Tabs
          label={`${a.name} sections`}
          idBase="asset"
          items={TABS.map((t) => ({ ...t, count: t.id === "diagnostics" && active.length ? active.length : undefined }))}
          value={current}
          onChange={(id) => navigate(id === "overview" ? `/assets/${assetId}` : `/assets/${assetId}/${id}`, { replace: true })}
        />
        <TabPanel idBase="asset" value={current} className="pt-5">
          {current === "overview" && <AssetOverview asset={a} activeAlarms={active} />}
          {current === "diagnostics" && (
            <Card>
              <AlarmTable alarms={alarms.data} isLoading={alarms.isLoading} error={alarms.error} onRetry={() => void alarms.refetch()} />
            </Card>
          )}
          {current === "sops" && (
            <Card>
              <SopTable
                rows={sops}
                isLoading={sopsByName.isLoading || sopsById.isLoading}
                error={sopsByName.error ?? sopsById.error}
                onRetry={() => {
                  void sopsByName.refetch();
                  void sopsById.refetch();
                }}
                onOpen={openSop}
                onAsk={(s) => ask(`Summarize ${s.id} (${s.title}) for ${a.name}: safety steps first.`)}
              />
            </Card>
          )}
          {current === "work-orders" && <AssetWorkOrders machineId={assetId} />}
          {current === "history" && <AssetHistory machineId={assetId} />}
          {current === "parts" && <AssetParts machineId={assetId} />}
        </TabPanel>
      </div>
    </div>
  );
}

function AssetWorkOrders({ machineId }: { machineId: string }) {
  const q = useWorkOrders({ machine_id: machineId });
  return (
    <Card>
      <WorkOrderTable rows={q.data?.work_orders} isLoading={q.isLoading} error={q.error} onRetry={() => void q.refetch()} showAsset={false} />
    </Card>
  );
}

function AssetHistory({ machineId }: { machineId: string }) {
  const q = useHistory({ machine_id: machineId, page_size: 25 });
  return (
    <Card>
      <HistoryTable events={q.data?.events} isLoading={q.isLoading} error={q.error} onRetry={() => void q.refetch()} showAsset={false} />
      <p className="px-4 py-3 border-t border-line text-meta">
        <Link to={`/history?machine_id=${machineId}`} className="font-semibold text-accent">
          Open the full history for this asset
        </Link>
      </p>
    </Card>
  );
}

function AssetParts({ machineId }: { machineId: string }) {
  const q = useMaintenanceHistory(machineId, 100);
  return (
    <Card>
      <PartsTable logs={q.data} isLoading={q.isLoading} error={q.error} onRetry={() => void q.refetch()} />
    </Card>
  );
}
