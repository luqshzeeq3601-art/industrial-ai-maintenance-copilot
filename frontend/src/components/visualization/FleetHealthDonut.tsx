import { useState } from "react";
import { Activity } from "lucide-react";

interface StatusDistribution {
  operational?: number;
  maintenance?: number;
  fault?: number;
  offline?: number;
  [key: string]: number | undefined;
}

interface FleetHealthDonutProps {
  distribution: StatusDistribution;
  totalUnits: number;
  uptimePercentage: number;
  selectedStatus?: string | null;
  onSelectStatus?: (status: string | null) => void;
}

interface Segment {
  key: string;
  label: string;
  count: number;
  color: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
}

export function FleetHealthDonut({
  distribution,
  totalUnits,
  uptimePercentage,
  selectedStatus,
  onSelectStatus
}: FleetHealthDonutProps) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const segments: Segment[] = [
    {
      key: "operational",
      label: "Operational",
      count: distribution.operational || 0,
      color: "#346538",
      bgColor: "bg-[#EDF3EC]",
      textColor: "text-[#346538]",
      borderColor: "border-[#346538]/30"
    },
    {
      key: "maintenance",
      label: "Maintenance",
      count: distribution.maintenance || 0,
      color: "#956400",
      bgColor: "bg-[#FBF3DB]",
      textColor: "text-[#956400]",
      borderColor: "border-[#956400]/30"
    },
    {
      key: "fault",
      label: "Fault Alarm",
      count: distribution.fault || 0,
      color: "#9F2F2D",
      bgColor: "bg-[#FDEBEC]",
      textColor: "text-[#9F2F2D]",
      borderColor: "border-[#9F2F2D]/30"
    }
  ];

  // SVG circle calculation
  const size = 180;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;

  return (
    <div className="h-full bg-[#FFFFFF] border border-[#EAEAEA] rounded-[var(--radius-outer)] p-5 shadow-[var(--shadow-tinted-sm)] flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#EAEAEA] pb-2.5 mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#64748B]" strokeWidth={2.2} />
          <h3 className="text-[10.5px] uppercase tracking-[0.08em] font-semibold font-mono text-[#64748B]">
            Health record — fleet & uptime
          </h3>
        </div>
        <span className="text-[11px] font-mono tabular-nums text-[#787774]">
          Live plant status
        </span>
      </div>

      {/* Donut & Legend Container */}
      <div className="flex flex-col sm:flex-row items-center justify-around gap-4 py-1">
        {/* SVG Donut */}
        <div className="relative w-[180px] h-[180px] flex items-center justify-center">
          <svg width={size} height={size} className="rotate-[-90deg]">
            {/* Background Track Circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#F4F4F2"
              strokeWidth={strokeWidth}
              fill="transparent"
            />

            {/* Segments */}
            {totalUnits > 0 &&
              segments.map((seg) => {
                if (seg.count === 0) return null;
                const percent = seg.count / totalUnits;
                const dashLength = circumference * percent;
                const dashOffset = -circumference * accumulatedPercent;
                accumulatedPercent += percent;

                const isHovered = hoveredKey === seg.key;
                const isSelected = selectedStatus === seg.key;

                return (
                  <circle
                    key={seg.key}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={seg.color}
                    strokeWidth={isHovered || isSelected ? strokeWidth + 4 : strokeWidth}
                    strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                    strokeDashoffset={dashOffset}
                    fill="transparent"
                    className="transition-all duration-300 cursor-pointer"
                    onMouseEnter={() => setHoveredKey(seg.key)}
                    onMouseLeave={() => setHoveredKey(null)}
                    onClick={() =>
                      onSelectStatus && onSelectStatus(selectedStatus === seg.key ? null : seg.key)
                    }
                  />
                );
              })}
          </svg>

          {/* Donut Center Telemetry Readout */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
            <span className="text-2xl font-bold font-mono tracking-tight text-[#111111]">
              {uptimePercentage}%
            </span>
            <span className="text-[10px] text-[#787774] uppercase tracking-wider font-semibold">
              Plant Uptime
            </span>
          </div>
        </div>

        {/* Legend & Breakdown Pills */}
        <div className="flex flex-col gap-2 w-full sm:w-auto min-w-[140px]">
          {segments.map((seg) => {
            const isHovered = hoveredKey === seg.key;
            const isSelected = selectedStatus === seg.key;
            const pct = totalUnits > 0 ? Math.round((seg.count / totalUnits) * 100) : 0;

            return (
              <button
                key={seg.key}
                type="button"
                onMouseEnter={() => setHoveredKey(seg.key)}
                onMouseLeave={() => setHoveredKey(null)}
                onClick={() =>
                  onSelectStatus && onSelectStatus(selectedStatus === seg.key ? null : seg.key)
                }
                className={`flex items-center justify-between p-2 rounded-md border text-left transition-all ${
                  isSelected
                    ? "border-[#111111] bg-[#F7F6F3]"
                    : isHovered
                    ? "border-[#CCCCCC] bg-[#FBFBFA]"
                    : "border-transparent bg-[#FBFBFA]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: seg.color }}
                  />
                  <span className="text-xs font-medium text-[#111111]">
                    {seg.label}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 font-mono text-xs">
                  <span className="font-semibold text-[#111111]">{seg.count}</span>
                  <span className="text-[10.5px] text-[#787774]">({pct}%)</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-3 pt-2 border-t border-[#EAEAEA] flex items-center justify-between text-[11px] text-[#787774] font-mono">
        <span>Total Fleet Units: {totalUnits}</span>
        {selectedStatus && (
          <button
            onClick={() => onSelectStatus && onSelectStatus(null)}
            className="text-[#111111] underline hover:text-[#787774]"
          >
            Clear Filter
          </button>
        )}
      </div>
    </div>
  );
}
