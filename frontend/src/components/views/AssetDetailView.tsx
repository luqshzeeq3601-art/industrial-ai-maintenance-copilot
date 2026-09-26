import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Gauge,
  Layers,
  MapPin,
  Package,
  Plus
} from "lucide-react";
import type { EquipmentData } from "../visualization/OperatingHoursBarChart";
import type { WorkOrderLog, Citation } from "../workspace/types";
import { EquipmentSchematicIcon } from "../workspace/EquipmentSchematicIcon";
import { statusMeta } from "../workspace/types";
import { DiagnosticsTab, SopsTab, LogsTab } from "../workspace/AssetTabs";
import type { Message } from "../workspace/types";

interface AssetDetailViewProps {
  machine: EquipmentData;
  workOrders: WorkOrderLog[];
  onBackToAssets: () => void;
  onOpenDiagnostics: () => void;
  onOpenSop: () => void;
  onCreateWorkOrder: () => void;
  onOpenCitation: (c: Citation) => void;
  chatMessages: Message[];
  chatLoading: boolean;
  onCheckAlarm: () => void;
  onRunDiagnostic: () => void;
}

export type DetailTab = "overview" | "diagnostics" | "sops" | "work-orders" | "parts";

export function AssetDetailView({
  machine,
  workOrders,
  onBackToAssets,
  onOpenDiagnostics,
  onOpenSop,
  onCreateWorkOrder,
  onOpenCitation,
  chatMessages,
  chatLoading,
  onCheckAlarm,
  onRunDiagnostic
}: AssetDetailViewProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");
  const [requisitionedPart, setRequisitionedPart] = useState<string | null>(null);

  const isFault = machine.status.toLowerCase() === "fault";
  const isMaint = machine.status.toLowerCase() === "maintenance";
  const meta = statusMeta(machine.status);

  // Active open fault log if any
  const openLog = workOrders.find((w) => !w.completed_at || w.severity?.toUpperCase() === "OPEN" || w.severity?.toLowerCase() === "critical") ?? null;
  const faultCode = openLog?.fault_code || (isFault ? "E-308" : null);

  const conditionScore = isFault ? 42 : isMaint ? 74 : 94;

  const handleRequisition = (code: string) => {
    setRequisitionedPart(code);
    setTimeout(() => setRequisitionedPart(null), 3000);
  };

  return (
    <div className="h-full w-full max-w-[1680px] mx-auto flex flex-col gap-3.5 sm:gap-4 overflow-y-auto custom-scrollbar animate-fade-in pb-4">
      {/* Top Header Card */}
      <div className="bg-panel rounded-xl border border-line-strong/70 shadow-[var(--shadow-cockpit)] p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3">
          <button
            type="button"
            onClick={onBackToAssets}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-small font-medium text-body hover:text-ink hover:bg-wash transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Assets</span>
          </button>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Machine Identity */}
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-xl bg-wash flex items-center justify-center shrink-0 border border-line p-2.5">
              <EquipmentSchematicIcon type={machine.type} className="w-9 h-9 text-body" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[22px] sm:text-[26px] font-bold text-ink tracking-tight">{machine.name}</h1>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-label font-semibold ${
                    isFault
                      ? "bg-danger-bg text-danger-ink border border-danger-line"
                      : isMaint
                      ? "bg-warn-bg text-warn-ink border border-warn-line"
                      : "bg-success-bg text-success-ink border border-success-line"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                  {meta.label}
                </span>
                <span className="font-mono text-small text-body font-semibold px-2 py-0.5 bg-wash rounded border border-line tabular-nums">
                  {machine.machine_id}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3.5 text-meta text-muted mt-1.5">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-subtle" />
                  <span>{machine.location}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-subtle" />
                  <span>{machine.type}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Icon-Driven Action CTAs */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onOpenDiagnostics}
              className="px-3.5 py-2 bg-accent text-white font-semibold rounded-lg text-small hover:bg-accent-hover transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Activity className="w-4 h-4" />
              <span>Diagnostics</span>
            </button>
            <button
              type="button"
              onClick={onCreateWorkOrder}
              className="px-3.5 py-2 bg-panel border border-line-strong text-ink font-semibold rounded-lg text-small hover:bg-wash transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-body" />
              <span>Work Order</span>
            </button>
            <button
              type="button"
              onClick={onOpenSop}
              className="px-3.5 py-2 bg-panel border border-line-strong text-ink font-semibold rounded-lg text-small hover:bg-wash transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-body" />
              <span>SOP</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3 Primary KPI Blocks */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        {/* KPI 1: Operating Hours */}
        <div className="bg-panel rounded-xl border border-line-strong/70 p-4 sm:p-5 shadow-[var(--shadow-cockpit)] flex items-center justify-between">
          <div>
            <span className="text-meta font-medium text-muted">Operating Hours</span>
            <div className="text-[26px] sm:text-[28px] font-bold font-mono text-ink tracking-tight mt-1 tabular-nums">
              {machine.operating_hours ? `${machine.operating_hours.toLocaleString()} h` : "—"}
            </div>
            <span className="text-label text-muted">98.4% uptime</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-accent/10 text-accent flex items-center justify-center border border-accent-line/40 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 2: Next Service */}
        <div className="bg-panel rounded-xl border border-line-strong/70 p-4 sm:p-5 shadow-[var(--shadow-cockpit)] flex items-center justify-between">
          <div>
            <span className="text-meta font-medium text-muted">Next Service</span>
            <div className="text-[26px] sm:text-[28px] font-bold font-mono text-ink tracking-tight mt-1">
              {machine.operating_hours && machine.operating_hours > 10000 ? (
                <span className="text-danger font-semibold">Overdue</span>
              ) : (
                "In ~240 h"
              )}
            </div>
            <span className="text-label text-muted">PM Interval: 2,500 h</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-warn-bg text-warn-ink flex items-center justify-center border border-warn-line shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 3: Machine Condition */}
        <div className="bg-panel rounded-xl border border-line-strong/70 p-4 sm:p-5 shadow-[var(--shadow-cockpit)] flex items-center justify-between">
          <div>
            <span className="text-meta font-medium text-muted">Condition Index</span>
            <div className="text-[26px] sm:text-[28px] font-bold font-mono text-ink tracking-tight mt-1 tabular-nums">
              <span className={isFault ? "text-danger" : isMaint ? "text-warn" : "text-success"}>
                {conditionScore}%
              </span>
            </div>
            <span className="text-label text-muted">
              {isFault ? "Trip Alarm Active" : isMaint ? "Service Required" : "Nominal State"}
            </span>
          </div>
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center border shrink-0 ${
              isFault
                ? "bg-danger-bg text-danger-ink border-danger-line"
                : isMaint
                ? "bg-warn-bg text-warn-ink border-warn-line"
                : "bg-success-bg text-success-ink border-success-line"
            }`}
          >
            <Gauge className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Critical Alarm Alert (When in Fault State) */}
      {isFault && (
        <div className="bg-danger-bg border border-danger-line rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-danger-solid text-white flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-danger text-label px-2 py-0.5 bg-panel rounded border border-danger-line">
                  {faultCode || "E-308"}
                </span>
                <span className="font-bold text-danger-ink text-small">Inverter Bus Undervoltage Alarm</span>
              </div>
              <p className="text-meta text-danger-ink/80 mt-0.5">
                DC bus voltage dropped below 520V safety trip limit. Immediate inspection of capacitor bank required.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onCheckAlarm}
              className="px-3 py-1.5 bg-panel border border-danger-line text-danger-ink font-semibold rounded-lg text-small hover:bg-danger-bg transition-colors cursor-pointer"
            >
              Copilot Diagnosis
            </button>
            <button
              type="button"
              onClick={onOpenSop}
              className="px-3 py-1.5 bg-danger-solid text-white font-semibold rounded-lg text-small hover:opacity-90 transition-opacity cursor-pointer"
            >
              Open Safety SOP
            </button>
          </div>
        </div>
      )}

      {/* Tab Navigation & Detailed Contents */}
      <div className="bg-panel rounded-xl border border-line-strong/70 shadow-[var(--shadow-cockpit)] overflow-hidden">
        {/* Tab Headers */}
        <div className="flex items-center gap-1 px-4 border-b border-line bg-sunken/40 overflow-x-auto custom-scrollbar">
          {[
            { id: "overview", label: "Overview", icon: Layers },
            { id: "diagnostics", label: "Diagnostics", icon: Activity },
            { id: "sops", label: "SOPs", icon: BookOpen },
            { id: "work-orders", label: "Work Orders", icon: FileText },
            { id: "parts", label: "Parts", icon: Package }
          ].map((tab) => {
            const on = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as DetailTab)}
                className={`flex items-center gap-1.5 py-3 px-3.5 border-b-2 font-medium text-small whitespace-nowrap transition-all duration-150 cursor-pointer ${
                  on ? "border-accent text-accent font-semibold" : "border-transparent text-muted hover:text-ink"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Panels */}
        <div className="p-4 sm:p-6">
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Asset Health Overview */}
              <div className="space-y-3.5">
                <h2 className="text-small font-bold text-ink">Subsystem Health Status</h2>
                <div className="space-y-2">
                  {[
                    { sub: "Spindle Drive & Inverter", status: isFault ? "Fault" : "Operational", score: isFault ? 45 : 98, tone: isFault ? "bg-danger" : "bg-success" },
                    { sub: "Hydraulic Clamping & Pressure", status: "Nominal", score: 92, tone: "bg-success" },
                    { sub: "Slideway Lubrication & Flow", status: isMaint ? "Warning" : "Nominal", score: isMaint ? 68 : 95, tone: isMaint ? "bg-warn" : "bg-success" },
                    { sub: "Coolant Concentration & pH", status: "Nominal", score: 89, tone: "bg-success" }
                  ].map((s, i) => (
                    <div key={i} className="p-3 rounded-lg border border-line bg-sunken/30 flex items-center justify-between">
                      <div className="min-w-0 pr-3">
                        <div className="font-semibold text-ink text-small">{s.sub}</div>
                        <div className="w-32 bg-line rounded-full h-1.5 mt-1.5 overflow-hidden">
                          <div className={`h-full ${s.tone} rounded-full`} style={{ width: `${s.score}%` }} />
                        </div>
                      </div>
                      <span className="text-label font-mono font-semibold text-muted tabular-nums">{s.score}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Machine Specifications */}
              <div className="space-y-3.5">
                <h2 className="text-small font-bold text-ink">Engineering Specifications</h2>
                <div className="rounded-lg border border-line bg-sunken/30 p-3.5 space-y-2">
                  <div className="flex justify-between py-1.5 border-b border-line text-meta">
                    <span className="text-muted">Manufacturer</span>
                    <span className="font-semibold text-ink">Apex Dynamics</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-line text-meta">
                    <span className="text-muted">Model</span>
                    <span className="font-mono text-ink">APX-500-CNC</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-line text-meta">
                    <span className="text-muted">Rating</span>
                    <span className="font-mono text-ink tabular-nums">45 kW 3-Phase</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-line text-meta">
                    <span className="text-muted">Max RPM</span>
                    <span className="font-mono text-ink tabular-nums">12,000 RPM</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-line text-meta">
                    <span className="text-muted">Controller</span>
                    <span className="font-mono text-ink">Siemens S7-1500</span>
                  </div>
                  <div className="flex justify-between py-1.5 text-meta">
                    <span className="text-muted">Lubricant</span>
                    <span className="font-medium text-ink">Mobil Vactra No 2</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "diagnostics" && (
            <DiagnosticsTab
              machine={machine}
              faultCode={faultCode}
              messages={chatMessages}
              loading={chatLoading}
              onCheckAlarm={onCheckAlarm}
              onRunDiagnostic={onRunDiagnostic}
              onInspectOverdue={onRunDiagnostic}
            />
          )}

          {activeTab === "sops" && (
            <SopsTab machine={machine} messages={chatMessages} loading={chatLoading} onOpenSop={onOpenSop} onOpenCitation={onOpenCitation} />
          )}

          {activeTab === "work-orders" && (
            <LogsTab logs={workOrders} logsState="ready" loading={chatLoading} onAuditLogs={onRunDiagnostic} />
          )}

          {activeTab === "parts" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-small font-bold text-ink">Recommended Spare & Replacement Parts</h2>
                  <p className="text-meta text-muted mt-0.5">OEM verified component catalog for {machine.name}</p>
                </div>
                {requisitionedPart && (
                  <div className="px-3 py-1 bg-success-bg text-success-ink border border-success-line rounded-lg text-small font-semibold flex items-center gap-1.5 animate-fade-in">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                    <span>Requisition submitted for {requisitionedPart}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { part: "Inverter Power Module (IGBT)", code: "PM-INV-45KW", bin: "Bin A-14", stock: 2, critical: true },
                  { part: "Lube Metering Valve Kit", code: "VALVE-LUBE-02", bin: "Bin C-08", stock: 8, critical: false },
                  { part: "Spindle Angular Bearing 7014", code: "BRG-7014-CT", bin: "Bin B-02", stock: 1, critical: true },
                  { part: "Coolant Filter 25µm Cartridge", code: "FLT-COOL-25", bin: "Bin D-11", stock: 14, critical: false }
                ].map((p, i) => (
                  <div key={i} className="p-3.5 rounded-xl border border-line bg-sunken/30 flex flex-col justify-between gap-3 hover:border-line-strong transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-ink text-small">{p.part}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="font-mono text-meta font-medium text-muted tabular-nums">{p.code}</span>
                          <span className="text-label px-1.5 py-0.5 rounded bg-panel border border-line text-subtle font-mono">{p.bin}</span>
                        </div>
                      </div>
                      <span
                        className={`text-label font-bold px-2 py-0.5 rounded-full border tabular-nums ${
                          p.stock <= 1
                            ? "bg-warn-bg text-warn-ink border-warn-line"
                            : "bg-success-bg text-success-ink border-success-line"
                        }`}
                      >
                        {p.stock} in stock
                      </span>
                    </div>

                    <div className="pt-2 border-t border-line/60 flex items-center justify-between">
                      <span className="text-label text-muted">OEM Stock Replacement</span>
                      <button
                        type="button"
                        onClick={() => handleRequisition(p.code)}
                        className="px-2.5 py-1 bg-panel border border-line text-accent font-semibold rounded-md text-meta hover:bg-accent hover:text-white transition-colors cursor-pointer"
                      >
                        Request Requisition
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
