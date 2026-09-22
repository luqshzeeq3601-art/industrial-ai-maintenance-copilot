import {
  Clock,
  Flag,
  Hash,
  MapPin,
  Tag,
  AlertTriangle,
  Cpu,
  ArrowRight
} from "lucide-react";
import type { EquipmentData } from "../visualization/OperatingHoursBarChart";
import { OVERHAUL_THRESHOLD, splitLocation, type WorkOrderLog } from "./types";
import { WorkOrderHistory, WorkOrderHistoryHeading } from "./WorkOrderHistory";

interface AssetPanelProps {
  machine: EquipmentData;
  logs: WorkOrderLog[];
  loadingLogs: boolean;
  expandedCode: string | null;
  onToggleExpand: (code: string | null) => void;
  onRunDiagnostic: () => void;
}

/** Asset dossier: definition cards, operating-hours gauge with safety markers, actions, and history. */
export function AssetPanel({
  machine,
  logs,
  loadingLogs,
  expandedCode,
  onToggleExpand,
  onRunDiagnostic
}: AssetPanelProps) {
  const pct = Math.round((machine.operating_hours / OVERHAUL_THRESHOLD) * 100);
  const isOverhaulNeeded = machine.operating_hours >= OVERHAUL_THRESHOLD;
  const isApproaching = machine.operating_hours >= 8000 && !isOverhaulNeeded;
  const [plant, cell] = splitLocation(machine.location);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 custom-scrollbar">
      <div className="mx-auto w-full max-w-[85ch] space-y-5">
        {/* Asset Specifications Bento Grid */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[12px] uppercase font-bold tracking-wider text-[#64748B] font-mono">
              Equipment Specifications & Location
            </h3>
            <span className="text-[11px] font-mono text-[#94A3B8]">
              Cell Telemetry Active
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#DFE6ED]">
              <div className="flex items-center gap-1.5 text-[11px] text-[#64748B] mb-1 font-mono">
                <Hash className="w-3.5 h-3.5 text-[#1B2A3A]" />
                Asset ID
              </div>
              <p className="font-mono text-[14px] font-bold text-[#16202B]">
                {machine.machine_id}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#DFE6ED]">
              <div className="flex items-center gap-1.5 text-[11px] text-[#64748B] mb-1 font-mono">
                <Tag className="w-3.5 h-3.5 text-[#1F6C9F]" />
                Class / Type
              </div>
              <p className="text-[13px] font-bold text-[#16202B] truncate" title={machine.type}>
                {machine.type}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#DFE6ED]">
              <div className="flex items-center gap-1.5 text-[11px] text-[#64748B] mb-1 font-mono">
                <MapPin className="w-3.5 h-3.5 text-[#346538]" />
                Facility Bay
              </div>
              <p className="text-[13px] font-bold text-[#16202B] truncate" title={machine.location}>
                {cell ? `${plant} · ${cell}` : plant}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#DFE6ED]">
              <div className="flex items-center gap-1.5 text-[11px] text-[#64748B] mb-1 font-mono">
                <Flag className="w-3.5 h-3.5 text-[#D97706]" />
                Criticality
              </div>
              <p className="text-[13px] font-bold text-[#16202B] capitalize">
                {machine.criticality} Level
              </p>
            </div>
          </div>
        </div>

        {/* Operating Hours Gauge Card */}
        <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#DFE6ED] shadow-[0_1px_2px_rgba(22,32,43,0.04)]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#F4F6F9] text-[#16202B] flex items-center justify-center">
                <Clock className="w-4 h-4 text-[#1B2A3A]" strokeWidth={2.2} />
              </div>
              <div>
                <span className="text-[13px] font-bold text-[#16202B] block">
                  Operating Wear Lifecycle
                </span>
                <span className="text-[11px] text-[#64748B]">
                  Threshold standard: {OVERHAUL_THRESHOLD.toLocaleString()} hours
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[20px] font-bold text-[#16202B] font-mono tabular-nums leading-none block">
                {machine.operating_hours.toLocaleString()} <span className="text-[13px] font-normal text-[#64748B]">h</span>
              </span>
              <span className={`text-[11px] font-mono font-semibold ${
                isOverhaulNeeded ? "text-[#D92D20]" : isApproaching ? "text-[#D97706]" : "text-[#16A34A]"
              }`}>
                {pct}% of Overhaul Limit
              </span>
            </div>
          </div>

          {/* Progress bar with safety markers */}
          <div
            className="relative h-3 rounded-full bg-[#E6ECF2] overflow-hidden"
            role="progressbar"
            aria-valuenow={Math.min(pct, 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Operating hours ${pct}% of overhaul threshold`}
          >
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isOverhaulNeeded
                  ? "bg-[#D92D20]"
                  : isApproaching
                  ? "bg-[#D97706]"
                  : "bg-gradient-to-r from-[#22C55E] to-[#16A34A]"
              }`}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>

          {/* Scale benchmarks */}
          <div className="mt-2 flex items-center justify-between text-[11px] text-[#64748B] font-mono">
            <span>0 h (New)</span>
            <span className="text-[#D97706]">8,000 h (Caution Window)</span>
            <span className="text-[#D92D20]">10,000 h (Mandatory Overhaul)</span>
          </div>
        </div>

        {/* Overdue Warning Alert Banner if applicable */}
        {isOverhaulNeeded && (
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-[#FFF8F7] border border-[#F3C2BD]">
            <div className="w-8 h-8 rounded-lg bg-[#D92D20] text-white flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-bold text-[#9F2F2D]">
                  Preventive Maintenance Overhaul Due
                </span>
                <span className="font-mono text-[11.5px] font-bold text-[#D92D20] bg-[#FCECEA] px-2 py-0.5 rounded">
                  +{(machine.operating_hours - OVERHAUL_THRESHOLD).toLocaleString()} hrs overdue
                </span>
              </div>
              <p className="text-[12px] text-[#7A3A38] mt-0.5 leading-relaxed">
                Unit has exceeded factory overhaul run-time specifications. Spindle wear, seal degradation, and bearing play increase unplanned breakdown risk.
              </p>
            </div>
          </div>
        )}

        {/* Tactile Primary Action Button */}
        <button
          type="button"
          onClick={onRunDiagnostic}
          className="group w-full flex items-center justify-between p-3.5 rounded-xl bg-[#1B2A3A] hover:bg-[#23374C] active:bg-[#121E2A] text-white transition-all duration-150 active:scale-[0.99] cursor-pointer shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B2A3A]"
        >
          <div className="flex items-center gap-3 text-left">
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-white shrink-0 group-hover:bg-white/20 transition-colors">
              <Cpu className="w-5 h-5 text-[#38BDF8]" />
            </div>
            <div>
              <span className="text-[14px] font-bold block leading-snug">
                Initiate Multi-Agent Diagnostic Audit
              </span>
              <span className="text-[11.5px] text-white/70 block">
                Correlate telemetry, historical logs & OEM technical manuals for {machine.machine_id}
              </span>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform shrink-0" />
        </button>

        {/* Historical Work Orders Section */}
        <div className="pt-2">
          <WorkOrderHistoryHeading />
          <WorkOrderHistory
            logs={logs}
            loading={loadingLogs}
            expandedCode={expandedCode}
            onToggleExpand={onToggleExpand}
          />
        </div>
      </div>
    </div>
  );
}
