import { Truck, Search, ChevronRight } from "lucide-react";
import type { EquipmentData } from "../visualization/OperatingHoursBarChart";

interface FleetRegisterPanelProps {
  equipment: EquipmentData[];
  selectedId: string;
  onSelect: (machineId: string) => void;
  searchFilter: string;
  onSearchChange: (value: string) => void;
}

export function FleetRegisterPanel({
  equipment,
  selectedId,
  onSelect,
  searchFilter,
  onSearchChange
}: FleetRegisterPanelProps) {
  const filtered = equipment.filter((eq) => {
    const q = searchFilter.toLowerCase();
    return (
      eq.machine_id.toLowerCase().includes(q) ||
      eq.name.toLowerCase().includes(q) ||
      eq.location.toLowerCase().includes(q)
    );
  });

  return (
    <aside
      aria-label="Fleet Register"
      className="w-full h-full flex flex-col bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden"
    >
      {/* Panel Header */}
      <div className="px-4 pt-4 pb-3 border-b border-[#E2E8F0]">
        <div className="flex items-center gap-2 mb-3">
          <Truck className="w-5 h-5 text-[#0F172A]" strokeWidth={2} />
          <h2 className="text-[16px] font-bold text-[#0F172A] tracking-tight">
            Fleet Register ({equipment.length})
          </h2>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" aria-hidden="true" />
          <label htmlFor="fleet-filter" className="sr-only">
            Filter fleet by ID, model, or bay
          </label>
          <input
            id="fleet-filter"
            type="text"
            value={searchFilter}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Filter ID, model, bay..."
            className="w-full min-h-[44px] bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg pl-9 pr-3 py-2.5 text-[14px] text-[#0F172A] placeholder-[#64748B] focus:outline-none focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/20 transition-all"
          />
        </div>
      </div>

      {/* Table Column Headers */}
      <div className="grid grid-cols-[1.15fr_0.9fr_1.15fr_0.8fr] items-center px-4 py-2 bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-bold tracking-wider text-[#475569] uppercase">
        <span>ID / MODEL</span>
        <span>LOCATION</span>
        <span>STATUS</span>
        <span className="text-right">HOURS</span>
      </div>

      {/* Asset Rows List */}
      <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-[#F1F5F9] custom-scrollbar">
        {filtered.map((item) => {
          const isSelected = item.machine_id === selectedId;
          const statusLower = item.status.toLowerCase();

          // Dot & badge colors matching reference
          const statusDot =
            statusLower === "fault"
              ? "bg-[#EF4444]"
              : statusLower === "maintenance"
              ? "bg-[#F59E0B]"
              : "bg-[#22C55E]";

          const statusLabel =
            statusLower === "fault"
              ? "Fault"
              : statusLower === "maintenance"
              ? "Maintenance"
              : "Operational";

          // Parse location into 2 lines if possible
          const locationParts = item.location.split(" ");
          const plantPart = locationParts.slice(0, 2).join(" ");
          const cellPart = locationParts.slice(2).join(" ");

          return (
            <div
              key={item.machine_id}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(item.machine_id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(item.machine_id);
                }
              }}
              className={`grid grid-cols-[1.15fr_0.9fr_1.15fr_0.8fr] items-center px-4 py-3 cursor-pointer transition-colors text-[13px] focus-visible:outline-2 focus-visible:outline-[#0F172A] ${
                isSelected
                  ? "bg-[#FEF2F2] border-l-4 border-[#DC2626]"
                  : "hover:bg-[#F8FAFC] border-l-4 border-transparent"
              }`}
            >
              {/* ID & Model */}
              <div className="min-w-0 pr-1">
                <span className="block font-bold text-[13px] leading-tight text-[#0F172A]">
                  {item.machine_id}
                </span>
                <span className="block text-[12px] text-[#475569] truncate mt-0.5" title={item.name}>
                  {item.name}
                </span>
              </div>

              {/* Location */}
              <div className="min-w-0 pr-1 text-[12px] text-[#334155] leading-snug">
                <span className="block truncate" title={item.location}>{plantPart || item.location}</span>
                {cellPart && <span className="block text-[12px] text-[#475569] truncate">{cellPart}</span>}
              </div>

              {/* Status */}
              <div className="flex items-center gap-1.5 min-w-0">
                <span className={`w-3 h-3 rounded-full shrink-0 ring-1 ring-black/10 ${statusDot}`} aria-hidden="true" />
                <span className="text-[12px] font-medium text-[#334155] truncate">
                  {statusLabel}
                </span>
              </div>

              {/* Hours & Chevron */}
              <div className="flex items-center justify-end gap-1 text-right font-mono text-[12px] text-[#334155]">
                <span>{item.operating_hours.toLocaleString()} h</span>
                <ChevronRight className="w-4 h-4 text-[#64748B] shrink-0" aria-hidden="true" />
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="p-8 text-center text-[13px] text-[#475569]" role="status">
            No equipment matching filter.
          </div>
        )}
      </div>
    </aside>
  );
}
