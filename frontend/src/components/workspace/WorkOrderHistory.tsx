import { ChevronRight } from "lucide-react";
import { formatDateTime, formatRelative, isOpenWorkOrder, type WorkOrderLog } from "./types";

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
      <p className="py-6 text-small text-muted border-y border-line" role="status">
        No work orders are recorded for this asset.
      </p>
    );
  }

  const grouped: { code: string; logs: WorkOrderLog[] }[] = [];
  for (const log of logs) {
    const g = grouped.find((x) => x.code === log.fault_code);
    if (g) g.logs.push(log);
    else grouped.push({ code: log.fault_code, logs: [log] });
  }

  return (
    <ul className="divide-y divide-line border-y border-line">
      {grouped.map((group) => {
        const latest = group.logs[0];
        const count = group.logs.length;
        const isOpen = group.logs.some(isOpenWorkOrder);
        const expanded = expandedCode === group.code;
        return (
          <li key={group.code} className="flex items-start gap-2.5 py-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-mono tabular-nums font-bold text-small text-ink flex-shrink-0">
                  {group.code}
                </span>
                {count > 1 && (
                  <span
                    className="flex-shrink-0 text-meta text-muted tabular-nums"
                    title={`${count} recorded occurrences`}
                  >
                    ×{count}
                  </span>
                )}
                <span className="text-small text-body truncate" title={latest.fault_description}>
                  {latest.fault_description.split(".")[0]}
                </span>
                <span className={`ml-auto flex-shrink-0 text-meta font-medium ${isOpen ? "text-danger" : "text-muted"}`}>
                  {isOpen ? "Open" : "Closed"}
                </span>
              </div>
              <p className="text-meta text-muted mt-0.5">
                {latest.action_taken}, {latest.technician}
              </p>
              <p className="text-meta text-subtle mt-0.5 tabular-nums">
                <time dateTime={latest.started_at} title={formatDateTime(latest.started_at)}>
                  {formatDateTime(latest.started_at)} ({formatRelative(latest.started_at)})
                </time>
              </p>
              {count > 1 && (
                <button
                  type="button"
                  onClick={() => onToggleExpand(expanded ? null : group.code)}
                  aria-expanded={expanded}
                  className="mt-0.5 inline-flex items-center gap-1 min-h-[36px] pointer-coarse:min-h-[44px] text-meta font-semibold text-accent hover:underline cursor-pointer"
                >
                  {expanded ? "Hide occurrences" : `Show all ${count} occurrences`}
                  <ChevronRight className={`w-3 h-3 transition-transform duration-200 ${expanded ? "rotate-90" : ""}`} aria-hidden="true" />
                </button>
              )}
              {expanded && (
                <div className="mt-1.5 space-y-1 border-l-2 border-line pl-2.5 animate-fade-in">
                  {group.logs.map((l) => (
                    <p key={l.id} className="text-meta text-muted tabular-nums">
                      <time dateTime={l.started_at}>{formatDateTime(l.started_at)}</time>, {l.technician}
                      {l.duration_mins > 0 ? `, ${l.duration_mins} min` : ", in progress"}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
