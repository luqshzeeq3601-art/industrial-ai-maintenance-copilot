import { useState } from "react";
import { CheckCheck, ShieldCheck } from "lucide-react";
import type { Alarm } from "../../api/models";
import { useAcknowledgeAlarm } from "../../api/queries";
import { formatDateTime } from "../../lib/format";
import { ALARM_STATUS } from "../../lib/status";
import { Button } from "../ui/Button";
import { DataTable, type Column } from "../ui/DataTable";
import { EmptyState } from "../ui/States";
import { StatusLabel } from "../ui/StatusLabel";

interface AlarmTableProps {
  alarms: Alarm[] | undefined;
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
  /** Show the asset column (plant-wide lists). */
  showAsset?: boolean;
}

/** Fault codes raised on a machine. Active alarms can be acknowledged; the result is logged to History. */
export function AlarmTable({ alarms, isLoading, error, onRetry, showAsset = false }: AlarmTableProps) {
  const ack = useAcknowledgeAlarm();
  const [failure, setFailure] = useState<string | null>(null);

  const columns: Column<Alarm>[] = [
    { key: "code", header: "Code", cell: (a) => <span className="font-data font-semibold">{a.code}</span> },
    ...(showAsset ? [{ key: "asset", header: "Asset", cell: (a: Alarm) => <span className="font-data">{a.machine_id}</span> }] : []),
    { key: "status", header: "Status", cell: (a) => <StatusLabel meta={ALARM_STATUS[a.status]} /> },
    {
      key: "description",
      header: "Description",
      cell: (a) => (
        <span className="block min-w-[180px]">
          {a.fault_description ?? "Unknown fault code"}
          {a.status === "acknowledged" && a.acknowledged_by && (
            <span className="block text-label text-body">Acknowledged by {a.acknowledged_by}</span>
          )}
        </span>
      )
    },
    { key: "detected", header: "Detected", cell: (a) => <span className="font-data whitespace-nowrap">{formatDateTime(a.triggered_at)}</span> },
    {
      key: "actions",
      header: "Actions",
      cell: (a) =>
        a.status === "active" ? (
          <Button
            size="sm"
            icon={CheckCheck}
            loading={ack.isPending && ack.variables === a.alarm_id}
            disabled={ack.isPending}
            onClick={() => {
              setFailure(null);
              ack.mutate(a.alarm_id, { onError: (err) => setFailure(`${a.code}: ${err.message}`) });
            }}
          >
            Acknowledge
          </Button>
        ) : (
          <span className="text-meta text-body">—</span>
        )
    }
  ];

  return (
    <div>
      {failure && (
        <p role="alert" className="mx-4 my-3 text-meta font-medium text-danger">
          Couldn't acknowledge {failure}
        </p>
      )}
      <DataTable
        caption="Fault codes"
        columns={columns}
        rows={alarms}
        rowKey={(a) => a.alarm_id}
        isLoading={isLoading}
        error={error}
        onRetry={onRetry}
        skeletonRows={4}
        empty={<EmptyState icon={ShieldCheck} title="No fault codes" message="Alarms raised by this machine appear here." />}
      />
    </div>
  );
}
