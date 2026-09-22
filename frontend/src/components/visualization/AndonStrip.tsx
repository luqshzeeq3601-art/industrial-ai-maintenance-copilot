import { useState } from "react";
import { Radio, Wrench, CheckCircle2, SlidersHorizontal, ChevronRight } from "lucide-react";
import type { EquipmentData } from "./OperatingHoursBarChart";

interface AndonStripProps {
  equipment: EquipmentData[];
  selectedId?: string;
  onSelect: (machineId: string) => void;
}

type StatusFilter = "all" | "operational" | "maintenance" | "fault";

export function AndonStrip({ equipment, selectedId, onSelect }: AndonStripProps) {
  const [filter, setFilter] = useState<StatusFilter>("all");

  const faultCount = equipment.filter((e) => e.status.toLowerCase() === "fault").length;
  const maintCount = equipment.filter((e) => e.status.toLowerCase() === "maintenance").length;
  const operCount = equipment.filter((e) => e.status.toLowerCase() === "operational").length;

  const filteredEquipment = equipment.filter((eq) => {
    if (filter === "all") return true;
    return eq.status.toLowerCase() === filter;
  });

  return (
    <div className="w-full">
      {/* Andon Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#DFE6ED] pb-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#1B2A3A] text-white flex items-center justify-center shrink-0 shadow-sm">
            <Radio className="w-4 h-4 text-[#22C55E] animate-pulse" strokeWidth={2.2} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-[13px] font-bold tracking-tight text-[#16202B]">
                Shop Floor Andon Board
              </h3>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold font-mono tracking-wide bg-[#EDF1F5] text-[#33465A]">
                LIVE FEED
              </span>
            </div>
            <p className="text-[11.5px] text-[#64748B]">
              Real-time line status across {equipment.length} plant machinery cells
            </p>
          </div>
        </div>

        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11.5px] font-semibold transition-all cursor-pointer ${
              filter === "all"
                ? "bg-[#1B2A3A] text-white shadow-sm"
                : "bg-[#F4F6F9] text-[#64748B] hover:text-[#16202B] hover:bg-[#EAEFF5]"
            }`}
          >
            <SlidersHorizontal className="w-3 h-3" />
            <span>All ({equipment.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilter("fault")}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11.5px] font-semibold transition-all cursor-pointer ${
              filter === "fault"
                ? "bg-[#D92D20] text-white shadow-sm"
                : "bg-[#FCECEA] text-[#D92D20] hover:bg-[#FADFDC]"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#D92D20] animate-pulse-alarm" />
            <span>Alarms ({faultCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilter("maintenance")}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11.5px] font-semibold transition-all cursor-pointer ${
              filter === "maintenance"
                ? "bg-[#D97706] text-white shadow-sm"
                : "bg-[#FEF3C7] text-[#B45309] hover:bg-[#FDE68A]"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#D97706] animate-pulse-amber" />
            <span>Service ({maintCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilter("operational")}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11.5px] font-semibold transition-all cursor-pointer ${
              filter === "operational"
                ? "bg-[#16A34A] text-white shadow-sm"
                : "bg-[#DCFCE7] text-[#15803D] hover:bg-[#BBF7D0]"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
            <span>Running ({operCount})</span>
          </button>
        </div>
      </div>

      {/* Andon Cells Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {filteredEquipment.map((eq) => {
          const isSelected = selectedId === eq.machine_id;
          const status = eq.status.toLowerCase();
          const isFault = status === "fault";
          const isMaint = status === "maintenance";
          const isOper = status === "operational";

          return (
            <button
              key={eq.machine_id}
              type="button"
              onClick={() => onSelect(eq.machine_id)}
              aria-selected={isSelected}
              className={`group relative text-left p-3 rounded-xl border transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B2A3A] active:scale-[0.98] cursor-pointer ${
                isSelected
                  ? "bg-[#FFFFFF] border-[#1B2A3A] shadow-[0_0_0_2px_#1B2A3A,0_2px_8px_rgba(27,42,58,0.12)]"
                  : isFault
                  ? "bg-[#FFF8F7] border-[#F3C2BD] hover:border-[#D92D20] shadow-[0_1px_3px_rgba(217,45,32,0.08)]"
                  : isMaint
                  ? "bg-[#FFFBF2] border-[#FDE68A] hover:border-[#D97706] shadow-[0_1px_3px_rgba(217,119,6,0.06)]"
                  : "bg-[#FFFFFF] border-[#DFE6ED] hover:border-[#94A3B8] shadow-[0_1px_2px_rgba(22,32,43,0.04)]"
              }`}
            >
              {/* Top Row: Machine ID and Status Beacon */}
              <div className="flex items-center justify-between gap-1.5 mb-1.5">
                <span className="font-mono text-[12.5px] font-bold text-[#16202B] tracking-tight">
                  {eq.machine_id}
                </span>

                <div className="flex items-center gap-1.5">
                  {isFault && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide bg-[#D92D20] text-white">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      ALARM
                    </span>
                  )}
                  {isMaint && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide bg-[#D97706] text-white">
                      <Wrench className="w-2.5 h-2.5" />
                      MAINT
                    </span>
                  )}
                  {isOper && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide bg-[#DCFCE7] text-[#15803D]">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      OK
                    </span>
                  )}
                </div>
              </div>

              {/* Machine Name */}
              <p className="text-[12px] font-medium text-[#33465A] truncate mb-2 group-hover:text-[#16202B]">
                {eq.name}
              </p>

              {/* Bottom Row: Location & Hours */}
              <div className="flex items-center justify-between text-[11px] text-[#64748B] pt-1.5 border-t border-[#DFE6ED]/60 font-mono tabular-nums">
                <span className="truncate max-w-[95px]">{eq.location}</span>
                <span className="font-semibold text-[#16202B] flex items-center gap-0.5">
                  {eq.operating_hours.toLocaleString()}h
                  <ChevronRight className="w-3 h-3 text-[#94A3B8] opacity-0 group-hover:opacity-100 transition-opacity" />
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
