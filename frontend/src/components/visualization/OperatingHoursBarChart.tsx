import { useState } from "react";
import { HardDrive, AlertTriangle } from "lucide-react";

export interface EquipmentData {
  machine_id: string;
  name: string;
  type: string;
  location: string;
  status: string;
  operating_hours: number;
  criticality: string;
}

interface OperatingHoursBarChartProps {
  equipment: EquipmentData[];
  onSelectEquipment?: (machineId: string) => void;
  selectedMachineId?: string;
}

export function OperatingHoursBarChart({
  equipment,
  onSelectEquipment,
  selectedMachineId
}: OperatingHoursBarChartProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Service interval threshold constant (e.g. 10,000 hours for standard industrial overhaul)
  const OVERHAUL_THRESHOLD = 10000;
  const maxHours = Math.max(...equipment.map((e) => e.operating_hours), OVERHAUL_THRESHOLD);

  const getCriticalityBadge = (crit: string) => {
    switch (crit.toLowerCase()) {
      case "critical":
        return { text: "text-[#9F2F2D]", bg: "bg-[#FDEBEC]", border: "border-[#9F2F2D]/30" };
      case "high":
        return { text: "text-[#956400]", bg: "bg-[#FBF3DB]", border: "border-[#956400]/30" };
      default:
        return { text: "text-[#787774]", bg: "bg-[#F4F4F2]", border: "border-[#EAEAEA]" };
    }
  };

  return (
    <div className="bg-[#FFFFFF] border border-[#EAEAEA] rounded-[var(--radius-outer)] p-5 shadow-[var(--shadow-tinted-sm)] flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#EAEAEA] pb-2.5 mb-3">
        <div className="flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-[#64748B]" strokeWidth={2.2} />
          <h3 className="text-[10.5px] uppercase tracking-[0.08em] font-semibold font-mono text-[#64748B]">
            Hours ledger — operating hours & wear
          </h3>
        </div>
        <div className="flex items-center gap-2 text-[10.5px] font-mono text-[#787774]">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded bg-[#346538]"></span>
            &lt; 8k hrs
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded bg-[#956400]"></span>
            8k-10k hrs
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded bg-[#9F2F2D]"></span>
            &gt; 10k hrs (Overhaul)
          </span>
        </div>
      </div>

      {/* Bar List */}
      <div className="space-y-2.5 overflow-y-auto max-h-[340px] pr-1 custom-scrollbar">
        {equipment.map((eq) => {
          const percent = Math.min(Math.round((eq.operating_hours / maxHours) * 100), 100);
          const isOverhaulNeeded = eq.operating_hours >= OVERHAUL_THRESHOLD;
          const isApproaching = eq.operating_hours >= 8000 && !isOverhaulNeeded;

          const barColor = isOverhaulNeeded
            ? "bg-[#9F2F2D]"
            : isApproaching
            ? "bg-[#956400]"
            : "bg-[#111111]";

          const critBadge = getCriticalityBadge(eq.criticality);
          const isSelected = selectedMachineId === eq.machine_id;
          const isHovered = hoveredId === eq.machine_id;

          return (
            <button
              key={eq.machine_id}
              type="button"
              onClick={() => onSelectEquipment && onSelectEquipment(eq.machine_id)}
              onMouseEnter={() => setHoveredId(eq.machine_id)}
              onMouseLeave={() => setHoveredId(null)}
              className={`w-full text-left p-2 rounded-md border transition-all flex flex-col gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] ${
                isSelected
                  ? "border-[#111111] bg-[#F7F6F3]"
                  : isHovered
                  ? "border-[#CCCCCC] bg-[#FBFBFA]"
                  : "border-[#EAEAEA] bg-[#FFFFFF]"
              }`}
            >
              {/* Row Header */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[#111111] font-mono">
                    {eq.machine_id}
                  </span>
                  <span className="text-[#787774] truncate max-w-[160px] sm:max-w-[220px]">
                    {eq.name}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-1.5 py-0.5 rounded-[4px] text-[10px] uppercase tracking-[0.06em] font-semibold font-mono border ${critBadge.bg} ${critBadge.text} ${critBadge.border}`}
                  >
                    {eq.criticality}
                  </span>
                  <span className="font-mono text-xs font-semibold text-[#111111]">
                    {eq.operating_hours.toLocaleString()} hrs
                  </span>
                </div>
              </div>

              {/* Progress Bar with Service Threshold Line */}
              <div className="relative w-full h-2 rounded bg-[#F4F4F2] overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 rounded ${barColor}`}
                  style={{ width: `${percent}%` }}
                />
              </div>

              {/* Status Warning if Overhaul threshold exceeded */}
              {isOverhaulNeeded && (
                <div className="flex items-center gap-1 text-[10.5px] text-[#9F2F2D] font-mono">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Service window exceeded (+{(eq.operating_hours - OVERHAUL_THRESHOLD).toLocaleString()} hrs)</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Threshold Metric Footer */}
      <div className="mt-3 pt-2 border-t border-[#EAEAEA] flex items-center justify-between text-[11px] text-[#787774] font-mono">
        <span>Preventive Service Standard: 10,000 hrs</span>
        <span>Click row to view work order timeline</span>
      </div>
    </div>
  );
}
