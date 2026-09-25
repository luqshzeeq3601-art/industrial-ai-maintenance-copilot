import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { FileSearch, Plus } from "lucide-react";
import { useEquipment, useSops } from "../api/queries";
import type { Sop, SopCategory, SopStatus } from "../api/models";
import { useCopilot } from "../app/copilotContext";
import { useCurrentUser } from "../app/sessionContext";
import { AddSopDialog } from "../components/sops/AddSopDialog";
import { SopTable } from "../components/sops/SopTable";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { ResetButton, SearchInput, SelectFilter } from "../components/ui/Filters";
import { PageHeader } from "../components/ui/PageHeader";
import { Pagination } from "../components/ui/Pagination";
import { EmptyState } from "../components/ui/States";
import { useUrlFilters } from "../hooks/useUrlFilters";
import { SOP_CATEGORIES, SOP_STATUS } from "../lib/status";

const FILTER_KEYS = ["q", "category", "asset", "status"] as const;
const PAGE_SIZE = 10;

export default function SopsPage() {
  const user = useCurrentUser();
  const navigate = useNavigate();
  const { chat, openDocument } = useCopilot();
  const [params, setParams] = useSearchParams();
  const { values, set, reset, page } = useUrlFilters(FILTER_KEYS);
  const [adding, setAdding] = useState(false);
  const equipment = useEquipment();
  const sops = useSops({
    q: values.q || undefined,
    category: (values.category || undefined) as SopCategory | undefined,
    asset: values.asset || undefined,
    status: (values.status || undefined) as SopStatus | undefined
  });

  useEffect(() => {
    document.title = "SOPs · Maintenance Copilot";
  }, []);

  const open = (s: Pick<Sop, "file">) => openDocument({ document: s.file, doc_type: "sop" });

  // Deep link from search or history: /sops?open=sop_file.md
  const openParam = params.get("open");
  useEffect(() => {
    if (!openParam) return;
    openDocument({ document: openParam, doc_type: "sop" });
    setParams(
      (p) => {
        const next = new URLSearchParams(p);
        next.delete("open");
        return next;
      },
      { replace: true }
    );
  }, [openParam, openDocument, setParams]);

  const assetOptions = useMemo(
    () => (equipment.data?.equipment ?? []).map((e) => ({ value: e.name, label: `${e.name} (${e.machine_id})` })),
    [equipment.data]
  );
  const rows = sops.data?.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const filtering = !!(values.q || values.category || values.asset || values.status);

  return (
    <div className="space-y-5">
      <PageHeader
        title="SOPs"
        subtitle="Standard operating procedures for safe, reliable operation."
        actions={
          user.role === "admin" ? (
            <Button variant="primary" icon={Plus} onClick={() => setAdding(true)}>
              Add SOP
            </Button>
          ) : undefined
        }
      />
      <Card>
        <div className="flex flex-wrap gap-3 p-4 border-b border-line">
          <SearchInput label="Search SOPs" placeholder="Search SOPs by title, ID, or asset…" value={values.q} onChange={(q) => set({ q })} className="flex-[2_1_260px]" />
          <SelectFilter label="Category" allLabel="All categories" value={values.category} onChange={(category) => set({ category })} options={SOP_CATEGORIES} className="flex-[1_1_160px]" />
          <SelectFilter label="Asset" allLabel="All assets" value={values.asset} onChange={(asset) => set({ asset })} options={assetOptions} className="flex-[1_1_180px]" />
          <SelectFilter
            label="Status"
            allLabel="All statuses"
            value={values.status}
            onChange={(status) => set({ status })}
            options={Object.entries(SOP_STATUS).map(([value, m]) => ({ value, label: m.label }))}
            className="flex-[1_1_140px]"
          />
          <ResetButton onClick={reset} disabled={!filtering} label="Clear filters" />
        </div>
        <SopTable
          rows={rows}
          isLoading={sops.isLoading}
          error={sops.error}
          onRetry={() => void sops.refetch()}
          onOpen={open}
          onAsk={(s) => {
            void chat.send(`Summarize ${s.id} (${s.title}): safety steps first, then the procedure.`);
            navigate("/assets");
          }}
          empty={
            <EmptyState
              icon={FileSearch}
              title={filtering ? "No SOPs match these filters" : "No SOPs yet"}
              message={filtering ? "Clear a filter or search for a different title or asset." : "Procedures appear here once they are added to the document library."}
              action={filtering ? <ResetButton onClick={reset} label="Clear filters" /> : undefined}
            />
          }
        />
        {sops.data && sops.data.length > 0 && (
          <Pagination page={page} pageSize={PAGE_SIZE} total={sops.data.length} onPageChange={(p) => set({ page: p })} noun="SOPs" />
        )}
      </Card>
      {user.role === "admin" && <AddSopDialog open={adding} onClose={() => setAdding(false)} />}
    </div>
  );
}
