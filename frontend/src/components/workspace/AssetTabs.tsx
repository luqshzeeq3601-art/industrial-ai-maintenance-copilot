import { useState } from "react";
import { AlertTriangle, BookOpen, ChevronRight, ClipboardList, FileText, ListChecks, Stethoscope } from "lucide-react";
import type { EquipmentData } from "../visualization/OperatingHoursBarChart";
import { WorkOrderHistory } from "./WorkOrderHistory";
import type { Citation, Message, WorkOrderLog } from "./types";

const SECTION_TITLE = "text-[15px] font-semibold text-ink";
const SECONDARY_BUTTON =
  "inline-flex items-center justify-center gap-2 min-h-[36px] px-3 rounded-md border border-line-strong bg-panel hover:bg-sunken text-ink text-[13px] font-medium transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed";

interface FaultBannerProps {
  machine: EquipmentData;
  faultCode: string | null;
  faultSummary: string;
  onCheckAlarm: () => void;
}

/** Active alarm; renders nothing for healthy assets (the status badge already says so). */
export function FaultBanner({ machine, faultCode, faultSummary, onCheckAlarm }: FaultBannerProps) {
  if (machine.status.toLowerCase() !== "fault") return null;

  return (
    <div className="flex items-center gap-3 pl-4 pr-2 py-2 min-h-[52px] rounded-lg border border-danger-line bg-danger-bg/50" role="alert">
      <AlertTriangle className="w-4 h-4 text-danger shrink-0" strokeWidth={2} aria-hidden="true" />
      <p className="flex-1 min-w-0 text-[14px] text-ink leading-snug">
        {faultCode && <span className="font-mono font-semibold text-danger mr-2">{faultCode}</span>}
        {faultSummary}
      </p>
      <button
        type="button"
        onClick={onCheckAlarm}
        className="shrink-0 inline-flex items-center gap-0.5 min-h-[36px] px-2.5 rounded-md text-[13px] font-medium text-danger-ink hover:bg-danger-bg transition-colors cursor-pointer"
        aria-label={`Explain alarm ${faultCode ?? ""}: ${faultSummary}`}
      >
        Explain
        <ChevronRight className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );
}

interface DiagnosticsTabProps {
  machine: EquipmentData;
  faultCode: string | null;
  messages: Message[];
  loading: boolean;
  onCheckAlarm: () => void;
  onRunDiagnostic: () => void;
  onInspectOverdue: () => void;
}

export function DiagnosticsTab({
  machine,
  faultCode,
  messages,
  loading,
  onCheckAlarm,
  onRunDiagnostic,
  onInspectOverdue
}: DiagnosticsTabProps) {
  const trace = [...messages].reverse().find((m) => m.workflow_trace?.length)?.workflow_trace ?? [];
  const isFault = machine.status.toLowerCase() === "fault";
  const alarmProbe = isFault
    ? { icon: AlertTriangle, title: faultCode ? `Explain alarm ${faultCode}` : "Explain active alarm", detail: "Meaning and corrective procedure", run: onCheckAlarm }
    : faultCode
    ? { icon: AlertTriangle, title: `Review last fault ${faultCode}`, detail: "Cause and recurrence risk", run: onCheckAlarm }
    : null;
  const probes = [
    ...(alarmProbe ? [alarmProbe] : []),
    { icon: Stethoscope, title: "Status check", detail: "History and operating condition", run: onRunDiagnostic },
    { icon: ListChecks, title: "Service checklist", detail: "Steps for the current service interval", run: onInspectOverdue }
  ];

  return (
    <div className="space-y-6">
      <section aria-labelledby="probes-heading">
        <h3 id="probes-heading" className={SECTION_TITLE}>Run a check</h3>
        <p className="text-[13px] text-muted mt-0.5">Answers appear in Overview.</p>
        <ul className="mt-3 grid gap-2 @min-[720px]:grid-cols-3">
          {probes.map(({ icon: Icon, title, detail, run }) => (
            <li key={title}>
              <button
                type="button"
                onClick={run}
                disabled={loading}
                className="w-full h-full flex items-start gap-2.5 px-3 py-2.5 min-h-[52px] rounded-md border border-line hover:border-accent-line hover:bg-accent-bg text-left transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Icon className="w-4 h-4 mt-0.5 text-accent shrink-0" aria-hidden="true" />
                <span>
                  <span className="block text-[13px] font-semibold text-ink">{title}</span>
                  <span className="block text-[12px] text-muted mt-0.5">{detail}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="trace-heading" className="pt-5 border-t border-line">
        <h3 id="trace-heading" className={SECTION_TITLE}>How the last answer was produced</h3>
        {trace.length === 0 ? (
          <p className="text-[13px] text-muted mt-2">Run a check to see the steps.</p>
        ) : (
          <ol className="mt-3 space-y-2.5">
            {trace.map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-[13px]">
                <span className="w-5 h-5 mt-px rounded-full bg-wash text-muted text-[11px] font-semibold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <span className="min-w-0">
                  <span className="font-semibold text-ink capitalize">{step.agent}</span>
                  <span className="block text-body">{step.summary}</span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

interface SopsTabProps {
  machine: EquipmentData;
  messages: Message[];
  loading: boolean;
  onOpenSop: () => void;
}

export function SopsTab({ machine, messages, loading, onOpenSop }: SopsTabProps) {
  const seen = new Set<string>();
  const cited: Citation[] = [];
  for (const m of messages) {
    for (const c of m.citations ?? []) {
      const key = `${c.document || c.source}-${c.page ?? ""}`;
      if (!seen.has(key)) {
        seen.add(key);
        cited.push(c);
      }
    }
  }

  return (
    <section aria-labelledby="sops-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 id="sops-heading" className={SECTION_TITLE}>Cited procedures</h3>
          <p className="text-[13px] text-muted mt-0.5">Manuals and SOPs referenced in this session.</p>
        </div>
        <button type="button" onClick={onOpenSop} disabled={loading} className={SECONDARY_BUTTON}>
          <FileText className="w-4 h-4 text-subtle" aria-hidden="true" />
          Get safety SOP
        </button>
      </div>

      {cited.length === 0 ? (
        <p className="mt-4 text-[13px] text-muted">
          None yet. Ask for the {machine.name} procedure and the sources will be listed here.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-line border-t border-line">
          {cited.map((c, i) => (
            <li key={i} className="flex items-start gap-3 py-3">
              <BookOpen className="w-4 h-4 mt-0.5 text-subtle shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-ink">
                  {c.document || c.source || "OEM manual"}
                  {c.page != null && <span className="font-normal text-muted">, page {c.page}</span>}
                </p>
                {c.snippet && <p className="text-[13px] text-body mt-0.5 line-clamp-2">{c.snippet}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

interface LogsTabProps {
  logs: WorkOrderLog[];
  logsState: "loading" | "ready" | "error";
  loading: boolean;
  onAuditLogs: () => void;
}

export function LogsTab({ logs, logsState, loading, onAuditLogs }: LogsTabProps) {
  const [expandedCode, setExpandedCode] = useState<string | null>(null);
  return (
    <section aria-labelledby="logs-heading">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 id="logs-heading" className={SECTION_TITLE}>Work order history</h3>
          <p className="text-[13px] text-muted mt-0.5">
            {logsState === "loading"
              ? "Loading records…"
              : logsState === "error"
              ? "Records couldn't be loaded."
              : `${logs.length} ${logs.length === 1 ? "record" : "records"}, grouped by fault code`}
          </p>
        </div>
        <button type="button" onClick={onAuditLogs} disabled={loading || logs.length === 0} className={SECONDARY_BUTTON}>
          <ClipboardList className="w-4 h-4 text-subtle" aria-hidden="true" />
          Find recurring faults
        </button>
      </div>
      {logsState !== "error" && (
        <WorkOrderHistory logs={logs} loading={logsState === "loading"} expandedCode={expandedCode} onToggleExpand={setExpandedCode} />
      )}
    </section>
  );
}
