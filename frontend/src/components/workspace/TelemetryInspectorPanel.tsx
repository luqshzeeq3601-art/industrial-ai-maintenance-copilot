import {
  BarChart2,
  FileText,
  Clock,
  Play,
  AlertCircle,
  Tag,
  Target,
  Wrench,
  MapPin,
  ShieldCheck
} from "lucide-react";
import type { EquipmentData } from "../visualization/OperatingHoursBarChart";
import type { WorkOrderLog } from "./types";

interface TelemetryInspectorPanelProps {
  machine: EquipmentData;
  logs: WorkOrderLog[];
  onRunDiagnostic: () => void;
  onSelectWorkOrder?: (log: WorkOrderLog) => void;
  onInspectOverdue?: () => void;
}

export function TelemetryInspectorPanel({
  machine,
  logs,
  onRunDiagnostic,
  onSelectWorkOrder,
  onInspectOverdue
}: TelemetryInspectorPanelProps) {
  const targetHours = 10000;
  const currentHours = machine.operating_hours;
  const percentage = Math.round((currentHours / targetHours) * 100);
  const isOverdue = currentHours > targetHours;
  const overdueDiff = currentHours - targetHours;

  return (
    <div className="w-full h-full flex flex-col gap-3 overflow-y-auto custom-scrollbar">
      {/* Top Card: Telemetry Inspector */}
      <section
        aria-label="Telemetry Inspector"
        className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4 flex flex-col shrink-0"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-[#0F172A]" strokeWidth={2} aria-hidden="true" />
            <h2 className="text-[16px] font-bold text-[#0F172A] tracking-tight">
              Telemetry Inspector
            </h2>
          </div>
          <span className="font-mono text-[13px] font-bold text-[#475569]">
            {machine.machine_id}
          </span>
        </div>

        {/* Property Table */}
        <div className="py-3 space-y-3 text-[13px] border-b border-[#E2E8F0]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#475569]">
              <Tag className="w-4 h-4 text-[#64748B]" aria-hidden="true" />
              <span>Asset ID</span>
            </div>
            <span className="font-mono font-semibold text-[#0F172A]">{machine.machine_id}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#475569]">
              <Target className="w-4 h-4 text-[#64748B]" aria-hidden="true" />
              <span>Asset name</span>
            </div>
            <span className="font-semibold text-[#0F172A]">{machine.name}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#475569]">
              <Wrench className="w-4 h-4 text-[#64748B]" aria-hidden="true" />
              <span>Type</span>
            </div>
            <span className="font-medium text-[#334155]">{machine.type}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#475569]">
              <MapPin className="w-4 h-4 text-[#64748B]" aria-hidden="true" />
              <span>Location</span>
            </div>
            <span className="font-medium text-[#334155]">{machine.location}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#475569]">
              <ShieldCheck className="w-4 h-4 text-[#64748B]" aria-hidden="true" />
              <span>Criticality</span>
            </div>
            <span className="font-semibold text-[#0F172A] capitalize">{machine.criticality}</span>
          </div>
        </div>

        {/* Operating Hours Meter */}
        <div className="py-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#0F172A]" strokeWidth={2} aria-hidden="true" />
              <span className="text-[14px] font-bold text-[#0F172A]">Operating Hours</span>
            </div>
            <span className="text-[18px] font-bold text-[#0F172A] font-mono leading-none tabular-nums">
              {currentHours.toLocaleString()} h
            </span>
          </div>

          {/* Progress Bar */}
          <div className="relative w-full h-3 bg-[#E2E8F0] rounded-full overflow-hidden" role="progressbar" aria-valuenow={Math.min(percentage, 100)} aria-valuemin={0} aria-valuemax={100} aria-label={`Operating hours ${percentage}% of target`}>
            <div
              className="h-full rounded-full bg-[#15803D] transition-all duration-500"
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[12px] font-mono text-[#475569] mt-2">
            <span>Target: {targetHours.toLocaleString()} h</span>
            <span className="font-bold text-[#334155]">{percentage}%</span>
          </div>
        </div>

        {/* Run Diagnostic Button */}
        <button
          type="button"
          onClick={onRunDiagnostic}
          className="w-full flex items-center justify-center gap-2 min-h-[44px] py-3 px-4 rounded-lg bg-[#1E293B] hover:bg-[#0F172A] active:bg-[#020617] text-white text-[14px] font-bold tracking-wide transition-all shadow-sm cursor-pointer"
        >
          <Play className="w-4 h-4 fill-current" aria-hidden="true" />
          <span>Run Diagnostic</span>
        </button>

        {/* Maintenance Overdue Alert Card (Interactive) */}
        {isOverdue && (
          <div
            onClick={() => { if (onInspectOverdue) onInspectOverdue(); }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                if (onInspectOverdue) onInspectOverdue();
              }
            }}
            role={onInspectOverdue ? "button" : undefined}
            tabIndex={onInspectOverdue ? 0 : undefined}
            title={onInspectOverdue ? "Click to query overdue maintenance checklist" : undefined}
            aria-label={onInspectOverdue ? `Maintenance overdue by ${overdueDiff.toLocaleString()} hours. Activate to query checklist.` : undefined}
            className={`mt-3 p-3 rounded-lg bg-[#FFF7ED] border border-[#FDBA74] flex items-start gap-2.5 transition-all focus-visible:outline-2 focus-visible:outline-[#0F172A] ${
              onInspectOverdue ? "hover:bg-[#FFEDD5] cursor-pointer" : ""
            }`}
          >
            <div className="w-6 h-6 rounded-full bg-[#EA580C] text-white flex items-center justify-center shrink-0 mt-0.5" aria-hidden="true">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-bold text-[#7C2D12]">
                Maintenance Overdue +{overdueDiff.toLocaleString()} h
              </div>
              <p className="text-[12px] text-[#7C2D12] mt-0.5 leading-relaxed">
                Schedule maintenance to avoid increased risk of failure.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Bottom Card: Work Order History */}
      <section
        aria-label="Work Order History"
        className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4 flex flex-col flex-1 min-h-[220px]"
      >
        <div className="flex items-center gap-2 pb-3 border-b border-[#E2E8F0]">
          <FileText className="w-5 h-5 text-[#0F172A]" strokeWidth={2} aria-hidden="true" />
          <h3 className="text-[15px] font-bold text-[#0F172A] tracking-tight">
            Work Order History
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-[#F1F5F9] custom-scrollbar pt-1">
          {logs.map((log) => {
            const isOpen = log.severity?.toUpperCase() === "OPEN" || log.fault_code.startsWith("E-");

            return (
              <div
                key={log.id}
                role="button"
                tabIndex={0}
                onClick={() => { if (onSelectWorkOrder) onSelectWorkOrder(log); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    if (onSelectWorkOrder) onSelectWorkOrder(log);
                  }
                }}
                className="py-3 first:pt-2 last:pb-1 rounded-lg px-2 hover:bg-[#F8FAFC] focus-visible:outline-2 focus-visible:outline-[#0F172A] transition-colors cursor-pointer"
                title="Click to query this work order"
                aria-label={`Work order ${log.fault_code}, ${isOpen ? "open" : "closed"}. Activate to investigate.`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-3 h-3 rounded-full shrink-0 ring-1 ring-black/10 ${
                        isOpen ? "bg-[#DC2626]" : "bg-[#16A34A]"
                      }`}
                      aria-hidden="true"
                    />
                    <span className="text-[13px] font-bold text-[#0F172A] truncate" title={`${log.fault_code} ${log.action_taken || "Maintenance Event"}`}>
                      {log.fault_code} {log.action_taken || "Maintenance Event"}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-1 text-[11px] font-bold rounded-md tracking-wide shrink-0 uppercase ${
                      isOpen
                        ? "bg-[#FEE2E2] text-[#991B1B]"
                        : "bg-[#DCFCE7] text-[#166534]"
                    }`}
                  >
                    {isOpen ? "OPEN" : "CLOSED"}
                  </span>
                </div>

                <div className="mt-1 pl-5 text-[12px] text-[#475569]">
                  <span>Technician {log.technician}</span>
                </div>

                <p className="mt-0.5 pl-5 text-[12px] text-[#334155] leading-relaxed">
                  {log.fault_description}
                </p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
