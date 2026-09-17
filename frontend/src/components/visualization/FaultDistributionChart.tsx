import { useState } from "react";
import { Wrench, Zap, Droplets, Wind, Code2, AlertOctagon } from "lucide-react";

interface CategoryStat {
  category: string;
  count: number;
}

interface IncidentBreakdown {
  category: string;
  occurrences: number;
  total_downtime_mins: number;
}

interface SeverityStat {
  severity: string;
  count: number;
}

interface FaultDistributionChartProps {
  categories: CategoryStat[];
  incidents?: IncidentBreakdown[];
  severities?: SeverityStat[];
  onSelectCategory?: (category: string | null) => void;
  selectedCategory?: string | null;
}

export function FaultDistributionChart({
  categories,
  incidents = [],
  severities = [],
  onSelectCategory,
  selectedCategory
}: FaultDistributionChartProps) {
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  const getCategoryMeta = (cat: string) => {
    switch (cat.toLowerCase()) {
      case "mechanical":
        return { label: "Mechanical", icon: Wrench, color: "#111111", barBg: "bg-[#111111]" };
      case "electrical":
        return { label: "Electrical", icon: Zap, color: "#956400", barBg: "bg-[#956400]" };
      case "hydraulic":
        return { label: "Hydraulic", icon: Droplets, color: "#1F6C9F", barBg: "bg-[#1F6C9F]" };
      case "pneumatic":
        return { label: "Pneumatic", icon: Wind, color: "#346538", barBg: "bg-[#346538]" };
      case "software":
        return { label: "Software/PLC", icon: Code2, color: "#5B21B6", barBg: "bg-[#5B21B6]" };
      default:
        return { label: cat, icon: AlertOctagon, color: "#787774", barBg: "bg-[#787774]" };
    }
  };

  const totalAlarms = categories.reduce((sum, c) => sum + c.count, 0);
  const maxCategoryCount = Math.max(...categories.map((c) => c.count), 1);

  return (
    <div className="bg-[#FFFFFF] border border-[#EAEAEA] rounded-md p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#EAEAEA] pb-2.5 mb-3">
        <div className="flex items-center gap-2">
          <Wrench className="w-4 h-4 text-[#111111]" strokeWidth={2.2} />
          <h3 className="font-semibold text-xs uppercase tracking-wider text-[#111111]">
            Alarm & Incident Distribution
          </h3>
        </div>
        <span className="text-[11px] font-mono text-[#787774]">
          {totalAlarms} Registered Fault Codes
        </span>
      </div>

      {/* Category Bars */}
      <div className="space-y-3 py-1">
        {categories.map((cat) => {
          const meta = getCategoryMeta(cat.category);
          const percent = Math.round((cat.count / maxCategoryCount) * 100);
          const incident = incidents.find(
            (i) => i.category.toLowerCase() === cat.category.toLowerCase()
          );

          const isSelected = selectedCategory === cat.category;
          const isHovered = hoveredCategory === cat.category;

          return (
            <button
              key={cat.category}
              type="button"
              onClick={() =>
                onSelectCategory &&
                onSelectCategory(selectedCategory === cat.category ? null : cat.category)
              }
              onMouseEnter={() => setHoveredCategory(cat.category)}
              onMouseLeave={() => setHoveredCategory(null)}
              className={`w-full text-left p-2 rounded-md border transition-all flex flex-col gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] ${
                isSelected
                  ? "border-[#111111] bg-[#F7F6F3]"
                  : isHovered
                  ? "border-[#CCCCCC] bg-[#FBFBFA]"
                  : "border-[#EAEAEA] bg-[#FFFFFF]"
              }`}
            >
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <meta.icon className="w-3.5 h-3.5 text-[#111111]" strokeWidth={2} />
                  <span className="font-semibold text-[#111111] font-mono">
                    {meta.label}
                  </span>
                </div>

                <div className="flex items-center gap-2 font-mono text-xs">
                  {incident && (
                    <span className="text-[10.5px] text-[#787774]">
                      {incident.occurrences} logs ({Math.round(incident.total_downtime_mins / 60)} hrs dt)
                    </span>
                  )}
                  <span className="font-semibold text-[#111111]">
                    {cat.count} codes
                  </span>
                </div>
              </div>

              {/* Bar */}
              <div className="w-full h-2 rounded bg-[#F4F4F2] overflow-hidden">
                <div
                  className={`h-full rounded transition-all duration-500 ${meta.barBg}`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* Severity Breakdown Badges */}
      {severities.length > 0 && (
        <div className="mt-3 pt-2.5 border-t border-[#EAEAEA]">
          <span className="text-[10px] text-[#787774] uppercase tracking-wider font-semibold block mb-1.5 font-mono">
            Severity Classification
          </span>
          <div className="flex flex-wrap gap-1.5">
            {severities.map((sev) => {
              const style =
                sev.severity.toLowerCase() === "critical"
                  ? "bg-[#FDEBEC] text-[#9F2F2D] border-[#9F2F2D]/20"
                  : sev.severity.toLowerCase() === "high"
                  ? "bg-[#FBF3DB] text-[#956400] border-[#956400]/20"
                  : sev.severity.toLowerCase() === "medium"
                  ? "bg-[#E1F3FE] text-[#1F6C9F] border-[#1F6C9F]/20"
                  : "bg-[#EDF3EC] text-[#346538] border-[#346538]/20";

              return (
                <span
                  key={sev.severity}
                  className={`px-2 py-0.5 rounded text-[10.5px] font-mono uppercase font-medium border ${style}`}
                >
                  {sev.severity}: {sev.count}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
