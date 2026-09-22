import { ChevronRight, FileText, Wrench } from "lucide-react";
import type { WorkOrderLog } from "./types";

interface WorkOrderHistoryProps {
  logs: WorkOrderLog[];
  loading: boolean;
  expandedCode: string | null;
  onToggleExpand: (code: string | null) => void;
}

/** Work-order history grouped by fault code; repeat alarms collapse. */
export function WorkOrderHistory({ logs, loading, expandedCode, onToggleExpand }: WorkOrderHistoryProps) {
  if (loading) {
    return (
      <div className="space-y-2" role="status" aria-label="Loading work order history">
        <div className="skeleton h-16 w-full" />
        <div className="skeleton h-16 w-full" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="p-4 text-center bg-[#F4F6F9] rounded-xl border border-dashed border-[#C3CFDB] space-y-1.5">
        <Wrench className="w-4 h-4 mx-auto text-[#64748B]" />
        <p className="text-xs font-bold text-[#16202B]">No work orders yet for this asset</p>
        <p className="text-[11.5px] text-[#64748B] leading-relaxed">
          Run a diagnostic to pull history or create the first record.
        </p>
      </div>
    );
  }

  const grouped: { code: string; logs: WorkOrderLog[] }[] = [];
  for (const log of logs) {
    const g = grouped.find((x) => x.code === log.fault_code);
    if (g) g.logs.push(log);
    else grouped.push({ code: log.fault_code, logs: [log] });
  }

  return (
    <div className="space-y-4">
      {grouped.slice(0, 5).map((group) => {
        const latest = group.logs[0];
        const count = group.logs.length;
        const isOpen = group.logs.some(
          (l) => l.severity.toLowerCase() === "critical" || l.severity.toLowerCase() === "high"
        );
        const expanded = expandedCode === group.code;
        return (
          <div key={group.code} className="flex items-start gap-2.5">
            <span
              className={`mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${isOpen ? "bg-[#D92D20]" : "bg-[#1A9E57]"}`}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-mono tabular-nums font-bold text-[13px] text-[#16202B] flex-shrink-0">
                  {group.code}
                </span>
                {count > 1 && (
                  <span
                    className="flex-shrink-0 px-1.5 py-0.5 rounded bg-[#EDF1F5] text-[#33465A] text-[10px] font-bold font-mono tabular-nums"
                    title={`${count} recorded occurrences`}
                  >
                    ×{count}
                  </span>
                )}
                <span className="text-[13px] text-[#64748B] truncate" title={latest.fault_description}>
                  {latest.fault_description.split(".")[0]}
                </span>
                <span
                  className={`ml-auto flex-shrink-0 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide ${
                    isOpen ? "bg-[#FCECEA] text-[#D92D20]" : "bg-[#E5F6EC] text-[#1A9E57]"
                  }`}
                >
                  {isOpen ? "OPEN" : "CLOSED"}
                </span>
              </div>
              <p className="text-[12px] text-[#64748B] mt-0.5">
                Technician <span className="font-mono tabular-nums">{latest.technician}</span>
              </p>
              <p className="text-[12.5px] text-[#64748B] leading-snug">{latest.action_taken}</p>
              {count > 1 && (
                <button
                  type="button"
                  onClick={() => onToggleExpand(expanded ? null : group.code)}
                  aria-expanded={expanded}
                  className="mt-1 inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#1B2A3A] hover:underline"
                >
                  {expanded ? "Hide occurrences" : `Show all ${count} occurrences`}
                  <ChevronRight className={`w-3 h-3 transition-transform duration-200 ${expanded ? "rotate-90" : ""}`} />
                </button>
              )}
              {expanded && (
                <div className="mt-1.5 space-y-1 border-l-2 border-[#DFE6ED] pl-2.5 animate-fade-in">
                  {group.logs.map((l) => (
                    <p key={l.id} className="text-[11.5px] text-[#64748B] font-mono tabular-nums">
                      {l.started_at} · {l.technician} · {l.duration_mins}m
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function WorkOrderHistoryHeading() {
  return (
    <div className="flex items-center gap-2 mb-2.5">
      <FileText className="w-4 h-4 text-[#16202B]" strokeWidth={2.2} />
      <h3 className="font-bold text-[14px] tracking-tight text-[#16202B]">Work Order History</h3>
    </div>
  );
}
