import {
  AlertTriangle,
  FileText,
  Database,
  ChevronRight
} from "lucide-react";
import type { EquipmentData } from "../visualization/OperatingHoursBarChart";

interface AssetHeaderProps {
  machine: EquipmentData;
  faultCode: string;
  faultSummary: string;
  onCheckAlarm: () => void;
  onOpenSop: () => void;
  onAuditLogs: () => void;
}

/** Active-asset identity block with alarm badge and quick action pill buttons. */
export function AssetHeader({
  machine,
  faultCode,
  faultSummary,
  onCheckAlarm,
  onOpenSop,
  onAuditLogs
}: AssetHeaderProps) {
  const isFault = machine.status.toLowerCase() === "fault";
  const displaySummary =
    faultCode === "E-402"
      ? "SPINDLE THERMAL OVERLOAD"
      : (faultSummary.toUpperCase() || "SPINDLE THERMAL OVERLOAD");

  return (
    <div className="px-5 pt-4 pb-4 shrink-0 bg-[#FFFFFF] border-b border-[#E2E8F0]">
      {/* Breadcrumbs */}
      <nav aria-label="Asset breadcrumb" className="flex items-center gap-1.5 text-[13px] text-[#475569] mb-2">
        <span>Assets</span>
        <ChevronRight className="w-3.5 h-3.5 text-[#64748B]" aria-hidden="true" />
        <span className="text-[#0F172A] font-semibold">{machine.machine_id}</span>
      </nav>

      {/* Asset Title Row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3.5 flex-wrap">
          <h1 className="text-[26px] font-bold text-[#0F172A] tracking-tight leading-none">
            {machine.name}
          </h1>

          {/* Alarm Badge Button */}
          {isFault && (
            <button
              type="button"
              onClick={onCheckAlarm}
              className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2.5 rounded-lg bg-[#B91C1C] hover:bg-[#991B1B] active:bg-[#7F1D1D] text-white text-[13px] font-bold tracking-wide transition-colors cursor-pointer shadow-sm"
              title={`Active Alarm: ${faultCode} - ${faultSummary}`}
              aria-label={`Active alarm ${faultCode}: ${faultSummary}. Activate to check alarm details.`}
            >
              <span className="w-5 h-5 rounded-full bg-white text-[#B91C1C] flex items-center justify-center text-[12px] font-black leading-none" aria-hidden="true">
                !
              </span>
              <span className="font-mono">{faultCode}</span>
              <span>{displaySummary}</span>
              <ChevronRight className="w-4 h-4 text-white/80 shrink-0" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* Subtitle */}
      <p className="text-[13px] text-[#475569] mt-2 flex items-center gap-2 font-medium">
        <span className="font-mono font-semibold text-[#334155]">{machine.machine_id}</span>
        <span className="text-[#94A3B8]" aria-hidden="true">|</span>
        <span>{machine.type}</span>
        <span className="text-[#94A3B8]" aria-hidden="true">|</span>
        <span>Installed 2020</span>
      </p>

      {/* 3 Quick Action Pill Buttons */}
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        <button
          type="button"
          onClick={onCheckAlarm}
          className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2.5 rounded-lg bg-[#FFFFFF] hover:bg-[#F8FAFC] active:bg-[#F1F5F9] border border-[#CBD5E1] hover:border-[#94A3B8] text-[#0F172A] text-[14px] font-semibold transition-all shadow-sm cursor-pointer"
        >
          <AlertTriangle className="w-4 h-4 text-[#B91C1C]" aria-hidden="true" />
          <span>Check Alarm {faultCode}</span>
        </button>

        <button
          type="button"
          onClick={onOpenSop}
          className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2.5 rounded-lg bg-[#FFFFFF] hover:bg-[#F8FAFC] active:bg-[#F1F5F9] border border-[#CBD5E1] hover:border-[#94A3B8] text-[#0F172A] text-[14px] font-semibold transition-all shadow-sm cursor-pointer"
        >
          <FileText className="w-4 h-4 text-[#334155]" aria-hidden="true" />
          <span>LOTO Safety SOP</span>
        </button>

        <button
          type="button"
          onClick={onAuditLogs}
          className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2.5 rounded-lg bg-[#FFFFFF] hover:bg-[#F8FAFC] active:bg-[#F1F5F9] border border-[#CBD5E1] hover:border-[#94A3B8] text-[#0F172A] text-[14px] font-semibold transition-all shadow-sm cursor-pointer"
        >
          <Database className="w-4 h-4 text-[#334155]" aria-hidden="true" />
          <span>SQL Log Audit</span>
        </button>
      </div>
    </div>
  );
}
