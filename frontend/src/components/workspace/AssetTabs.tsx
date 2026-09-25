import { useState } from "react";
import { AlertTriangle, BookOpen, ChevronRight, ClipboardList, FileText, ListChecks, Stethoscope } from "lucide-react";
import type { EquipmentData } from "../visualization/OperatingHoursBarChart";
import { WorkOrderHistory } from "./WorkOrderHistory";
import { citationTitle, formatRelative, type Citation, type Message, type WorkOrderLog } from "./types";

const SECTION_TITLE = "text-copy font-semibold text-ink";
const SECONDARY_BUTTON =
  "inline-flex items-center justify-center gap-2 min-h-[36px] px-3 rounded-md border border-line-strong bg-panel hover:bg-sunken text-ink text-small font-medium transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed";

interface FaultBannerProps {
  machine: EquipmentData;
  /** The open work order behind the alarm, if one is logged. */
  openLog: WorkOrderLog | null;
  /** Most recent work order of any state, shown when nothing is open. */
  lastLog: WorkOrderLog | null;
  logsLoading: boolean;
  busy: boolean;
  onCheckAlarm: () => void;
}

/** Active alarm, stated from the record: fault code, what was logged, when, and by whom. */
export function FaultBanner({ machine, openLog, lastLog, logsLoading, busy, onCheckAlarm }: FaultBannerProps) {
  if (machine.status.toLowerCase() !== "fault") return null;
  const code = openLog?.fault_code ?? null;
  const summary = openLog?.fault_description?.split(".")[0] || "The asset is reporting a fault";
  const severity = openLog?.severity ? openLog.severity.charAt(0).toUpperCase() + openLog.severity.slice(1).toLowerCase() : null;

  return (
    <div className="rounded-xl border border-red-200 bg-red-50/80 p-4 shadow-xs" role="alert">
      <div className="flex flex-col @min-[540px]:flex-row @min-[540px]:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-red-100 border border-red-200 flex items-center justify-center text-red-600 shrink-0">
            <AlertTriangle className="w-5 h-5" strokeWidth={2.2} aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-label font-bold px-2.5 py-0.5 rounded-full bg-red-600 text-white tracking-wider shadow-xs">
                {code ? `ALARM ${code}` : "ACTIVE ALARM"}
              </span>
              <span className="font-mono text-label font-semibold px-2.5 py-0.5 rounded-full border border-red-400/60 text-red-700 tracking-wider">
                {severity ? `${severity.toUpperCase()} INTERLOCK` : "ACTIVE CRITICAL INTERLOCK"}
              </span>
            </div>
            <h2 className="mt-2 text-title font-bold text-ink leading-snug tracking-tight">{summary}</h2>
            <p className="mt-1 text-small text-body leading-relaxed">
              {logsLoading
                ? "Loading the work order record…"
                : openLog
                  ? `Work order #${openLog.id} opened ${formatRelative(openLog.started_at)} by ${openLog.technician}. ${openLog.action_taken || "Copilot triage detected sub-nominal operating parameters. Investigation procedure ready."}`
                  : lastLog
                    ? `No open work order is logged. The last one, #${lastLog.id} for ${lastLog.fault_code}, was completed ${formatRelative(lastLog.completed_at || lastLog.started_at)}.`
                    : "No work order is logged for this asset yet."}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onCheckAlarm}
          disabled={busy}
          className="shrink-0 self-start @min-[540px]:self-center inline-flex items-center gap-1.5 min-h-[38px] px-4 rounded-lg font-semibold text-label tracking-wide bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-xs transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {code ? `Explain ${code}` : "Explain the fault"}
          <ChevronRight className="w-4 h-4 ml-0.5" aria-hidden="true" />
        </button>
      </div>
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
        <h2 id="probes-heading" className="text-section font-semibold text-ink">Run a check</h2>
        <p className="text-meta text-muted mt-0.5">Automated diagnostic procedures and service audits. Answers appear in Overview.</p>
        <ul className="mt-3.5 grid gap-3 @min-[720px]:grid-cols-3">
          {probes.map(({ icon: Icon, title, detail, run }) => {
            const isAlarm = title.toLowerCase().includes("alarm") || title.toLowerCase().includes("fault");
            const isService = title.toLowerCase().includes("service") || title.toLowerCase().includes("checklist");
            return (
              <li key={title}>
                <button
                  type="button"
                  onClick={run}
                  disabled={loading}
                  className={`w-full h-full flex items-start gap-3 p-3.5 rounded-lg border text-left transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed group ${
                    isAlarm
                      ? "border-red-200 bg-red-50/40 hover:border-red-400 hover:bg-red-50"
                      : "border-line bg-sunken hover:border-blue-400 hover:bg-blue-50/40"
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                      isAlarm
                        ? "bg-red-100 border-red-200 text-red-600"
                        : isService
                        ? "bg-amber-100 border-amber-200 text-amber-600"
                        : "bg-blue-100 border-blue-200 text-blue-600"
                    }`}
                  >
                    <Icon className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
                  </div>
                  <span className="min-w-0 flex-1">
                    <span className="block text-small sm:text-title font-semibold text-ink leading-tight">{title}</span>
                    <span className="block text-meta text-muted mt-1 leading-snug">{detail}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="trace-heading" className="pt-5 border-t border-line">
        <h2 id="trace-heading" className="text-section font-semibold text-ink">How the last answer was produced</h2>
        {trace.length === 0 ? (
          <p className="text-meta text-muted mt-1.5">No active trace. Run a check to inspect multi-agent orchestration steps.</p>
        ) : (
          <ol className="mt-3.5 space-y-2.5">
            {trace.map((step, i) => (
              <li key={i} className="flex items-start gap-3 p-2.5 rounded-lg border border-line bg-sunken/60 text-small">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 font-mono text-label font-bold flex items-center justify-center shrink-0 border border-blue-200">
                  {i + 1}
                </span>
                <span className="min-w-0">
                  <span className="font-semibold text-ink capitalize tracking-wide">{step.agent}</span>
                  <span className="block text-body mt-0.5 leading-relaxed text-small">{step.summary}</span>
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
  onOpenCitation: (citation: Citation) => void;
}

export function SopsTab({ machine, messages, loading, onOpenSop, onOpenCitation }: SopsTabProps) {
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
          <h2 id="sops-heading" className={SECTION_TITLE}>Cited procedures</h2>
          <p className="text-small text-muted mt-0.5">Manuals and SOPs referenced in this session.</p>
        </div>
        <button type="button" onClick={onOpenSop} disabled={loading} className={SECONDARY_BUTTON}>
          <FileText className="w-4 h-4 text-subtle" aria-hidden="true" />
          Get safety SOP
        </button>
      </div>

      {cited.length === 0 ? (
        <p className="mt-4 text-small text-muted">
          None yet. Ask for the {machine.name} procedure and the sources will be listed here.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-line border-t border-line">
          {cited.map((c, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => onOpenCitation(c)}
                className="w-full flex items-start gap-3 py-3 px-2 -mx-2 rounded-md text-left hover:bg-sunken cursor-pointer"
              >
                <BookOpen className="w-4 h-4 mt-0.5 text-subtle shrink-0" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block text-small font-semibold text-ink">
                    {citationTitle(c)}
                    {c.page != null && <span className="font-normal text-muted">, page {c.page}</span>}
                  </span>
                  {c.snippet && <span className="block text-small text-body mt-0.5 line-clamp-2">{c.snippet}</span>}
                </span>
                <ChevronRight className="w-4 h-4 mt-0.5 text-subtle shrink-0" aria-hidden="true" />
              </button>
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
          <h2 id="logs-heading" className={SECTION_TITLE}>Work order history</h2>
          <p className="text-small text-muted mt-0.5">
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
