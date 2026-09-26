import { useState, useMemo } from "react";
import {
  Activity,
  Plus,
  RotateCcw,
  Search,
  User,
  X
} from "lucide-react";
import type { WorkOrderLog } from "../workspace/types";

interface WorkOrdersViewProps {
  logs: WorkOrderLog[];
  onSelectWorkOrder: (log: WorkOrderLog) => void;
  onCreateWorkOrder: () => void;
}

export function WorkOrdersView({ logs, onSelectWorkOrder, onCreateWorkOrder }: WorkOrdersViewProps) {
  const [statusTab, setStatusTab] = useState<"all" | "open" | "in-progress" | "closed">("all");
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [inspectingOrder, setInspectingOrder] = useState<WorkOrderLog | null>(null);

  const normalizedLogs = useMemo(() => {
    if (logs.length > 0) return logs;
    return [
      {
        id: 1024,
        machine_id: "EQ-1000",
        fault_code: "E-308",
        fault_description: "Inverter DC Bus Undervoltage Trip",
        action_taken: "Measuring bus bar capacitor bank ESR and pre-charge circuit.",
        technician: "David Chen",
        started_at: "2026-09-26T10:30:00Z",
        completed_at: "",
        duration_mins: 0,
        parts_replaced: "Inverter Power Module",
        severity: "critical"
      },
      {
        id: 1023,
        machine_id: "EQ-1003",
        fault_code: "H-204",
        fault_description: "Hydraulic proportional valve seal wear",
        action_taken: "Replaced high pressure Viton O-ring seal kit and ran pressure test.",
        technician: "Marcus Wong",
        started_at: "2026-09-25T14:00:00Z",
        completed_at: "2026-09-25T16:30:00Z",
        duration_mins: 150,
        parts_replaced: "Viton O-Ring Kit #4",
        severity: "high"
      },
      {
        id: 1022,
        machine_id: "EQ-2001",
        fault_code: "M-112",
        fault_description: "SMT feeder vacuum nozzle misalignment",
        action_taken: "Cleaned optical sensor and re-zeroed pick height offset.",
        technician: "Sarah Jenkins",
        started_at: "2026-09-24T09:15:00Z",
        completed_at: "2026-09-24T10:00:00Z",
        duration_mins: 45,
        parts_replaced: "None",
        severity: "medium"
      },
      {
        id: 1021,
        machine_id: "EQ-1005",
        fault_code: "PM-100",
        fault_description: "Monthly coolant filter replacement",
        action_taken: "Drained reservoir, wiped debris trap, and installed 25µm cartridge.",
        technician: "Alex Rodriguez",
        started_at: "2026-09-22T08:00:00Z",
        completed_at: "2026-09-22T09:30:00Z",
        duration_mins: 90,
        parts_replaced: "Coolant Filter Cartridge",
        severity: "low"
      }
    ];
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return normalizedLogs.filter((wo) => {
      const isOpen = !wo.completed_at || wo.severity?.toUpperCase() === "OPEN";
      const matchStatus =
        statusTab === "all" ||
        (statusTab === "open" && isOpen) ||
        (statusTab === "in-progress" && isOpen && wo.started_at) ||
        (statusTab === "closed" && !isOpen);

      const matchPriority = priorityFilter === "all" || wo.severity?.toLowerCase() === priorityFilter;

      const matchSearch =
        !search.trim() ||
        wo.fault_description.toLowerCase().includes(search.toLowerCase()) ||
        wo.machine_id.toLowerCase().includes(search.toLowerCase()) ||
        wo.technician.toLowerCase().includes(search.toLowerCase()) ||
        `wo-${wo.id}`.toLowerCase().includes(search.toLowerCase());

      return matchStatus && matchPriority && matchSearch;
    });
  }, [normalizedLogs, statusTab, priorityFilter, search]);

  const getPriorityBadge = (sev?: string) => {
    switch (sev?.toLowerCase()) {
      case "critical":
        return "bg-danger-bg text-danger-ink border-danger-line";
      case "high":
        return "bg-warn-bg text-warn-ink border-warn-line";
      case "medium":
        return "bg-accent-bg text-accent-ink border-accent-line";
      default:
        return "bg-wash text-body border-line";
    }
  };

  return (
    <div className="h-full w-full max-w-[1680px] mx-auto flex flex-col bg-panel rounded-xl border border-line-strong/70 shadow-[var(--shadow-cockpit)] overflow-hidden animate-fade-in relative">
      {/* Streamlined Header */}
      <div className="p-4 sm:px-5 sm:py-4 border-b border-line flex flex-wrap items-center justify-between gap-3 bg-panel">
        <div className="flex items-center gap-3">
          <h1 className="text-[24px] sm:text-[28px] font-bold text-ink tracking-tight">Work Orders</h1>
          <span className="text-meta font-mono font-medium px-2 py-0.5 bg-sunken border border-line rounded-md text-muted tabular-nums">
            {filteredLogs.length} Orders
          </span>
        </div>

        <button
          type="button"
          onClick={onCreateWorkOrder}
          className="px-3.5 py-2 bg-accent text-white font-semibold rounded-lg text-small hover:bg-accent-hover transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>New Work Order</span>
        </button>
      </div>

      {/* Fluid Status Tabs Bar */}
      <div className="flex flex-wrap items-center justify-between px-4 border-b border-line bg-sunken/40">
        <div className="flex items-center gap-1">
          {[
            { id: "all", label: "All Orders" },
            { id: "open", label: "Open" },
            { id: "in-progress", label: "In Progress" },
            { id: "closed", label: "Closed" }
          ].map((tab) => {
            const on = statusTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusTab(tab.id as typeof statusTab)}
                className={`py-2.5 px-3.5 border-b-2 font-medium text-small transition-all duration-150 cursor-pointer ${
                  on ? "border-accent text-accent font-semibold" : "border-transparent text-muted hover:text-ink"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search & Filter */}
        <div className="flex items-center gap-2 py-2">
          <div className="relative min-w-[180px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-subtle" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search WO or asset…"
              className="w-full pl-8 pr-2.5 py-1 bg-panel border border-line-strong rounded-lg text-meta text-ink placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-accent transition-shadow"
            />
          </div>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-2.5 py-1 bg-panel border border-line-strong rounded-lg text-meta text-ink focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer"
          >
            <option value="all">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {(search || priorityFilter !== "all" || statusTab !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setPriorityFilter("all");
                setStatusTab("all");
              }}
              className="px-2 py-1 text-meta text-muted hover:text-ink inline-flex items-center gap-1 rounded-md hover:bg-wash transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Orders Table */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 z-10 bg-sunken border-b border-line text-label font-semibold text-muted tracking-wide">
            <tr>
              <th className="py-2.5 px-4">WO ID</th>
              <th className="py-2.5 px-3">Asset</th>
              <th className="py-2.5 px-3">Fault / Description</th>
              <th className="py-2.5 px-3">Priority</th>
              <th className="py-2.5 px-3">Technician</th>
              <th className="py-2.5 px-3">Date</th>
              <th className="py-2.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line text-small">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-muted">
                  No matching work orders found.
                </td>
              </tr>
            ) : (
              filteredLogs.map((wo) => {
                return (
                  <tr
                    key={wo.id}
                    onClick={() => setInspectingOrder(wo)}
                    className="hover:bg-sunken group transition-colors duration-100 cursor-pointer"
                  >
                    <td className="py-3 px-4 font-mono text-meta font-bold text-ink whitespace-nowrap tabular-nums">
                      #{wo.id}
                    </td>

                    <td className="py-3 px-3">
                      <span className="font-mono text-meta font-bold text-body px-2 py-0.5 bg-wash rounded border border-line tabular-nums">
                        {wo.machine_id}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <div className="font-semibold text-ink group-hover:text-accent transition-colors">
                        {wo.fault_description}
                      </div>
                      <div className="text-label text-muted truncate max-w-md">
                        {wo.action_taken || "Diagnostic in progress"}
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-label font-semibold border ${getPriorityBadge(
                          wo.severity
                        )}`}
                      >
                        {wo.severity || "Normal"}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-meta text-body">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-subtle" />
                        <span>{wo.technician || "Unassigned"}</span>
                      </div>
                    </td>

                    <td className="py-3 px-3 font-mono text-meta text-muted whitespace-nowrap tabular-nums">
                      {wo.started_at ? new Date(wo.started_at).toLocaleDateString() : "Pending"}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectWorkOrder(wo);
                        }}
                        className="px-2.5 py-1 text-meta font-semibold text-accent hover:bg-accent-bg rounded-md transition-colors inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>Investigate</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Interactive Work Order Slide-Over Inspector */}
      {inspectingOrder && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="wo-detail-title"
          className="absolute inset-y-0 right-0 w-full max-w-md bg-panel border-l border-line shadow-2xl z-20 flex flex-col animate-slide-in"
        >
          <div className="p-4 border-b border-line flex items-center justify-between bg-sunken/40">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-label font-bold border ${getPriorityBadge(inspectingOrder.severity)}`}>
                {inspectingOrder.severity || "Normal"}
              </span>
              <span className="font-mono text-label text-muted font-bold">WO #{inspectingOrder.id}</span>
            </div>
            <button
              type="button"
              onClick={() => setInspectingOrder(null)}
              className="p-1 rounded-md text-muted hover:text-ink hover:bg-wash transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
            <div>
              <h2 id="wo-detail-title" className="text-title font-bold text-ink leading-snug">
                {inspectingOrder.fault_description}
              </h2>
              <div className="flex items-center gap-2 text-meta text-muted mt-1.5 font-mono">
                <span>Asset: <strong className="text-ink">{inspectingOrder.machine_id}</strong></span>
                {inspectingOrder.fault_code && <span>• Code: <strong className="text-danger">{inspectingOrder.fault_code}</strong></span>}
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-line bg-sunken/30 space-y-2">
              <span className="text-label font-bold uppercase tracking-wider text-muted font-mono">
                Maintenance Action Protocol
              </span>
              <p className="text-small text-body leading-relaxed">
                {inspectingOrder.action_taken || "Diagnostic measurements and root cause evaluation underway."}
              </p>
            </div>

            <div className="rounded-xl border border-line divide-y divide-line text-meta bg-panel">
              <div className="p-3 flex justify-between">
                <span className="text-muted">Technician</span>
                <span className="font-semibold text-ink">{inspectingOrder.technician || "Unassigned"}</span>
              </div>
              <div className="p-3 flex justify-between">
                <span className="text-muted">Parts Replaced</span>
                <span className="font-mono font-medium text-ink">{inspectingOrder.parts_replaced || "None"}</span>
              </div>
              <div className="p-3 flex justify-between">
                <span className="text-muted">Logged Duration</span>
                <span className="font-mono font-semibold text-ink tabular-nums">
                  {inspectingOrder.duration_mins ? `${inspectingOrder.duration_mins} mins` : "In Progress"}
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-line bg-sunken/30 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                onSelectWorkOrder(inspectingOrder);
                setInspectingOrder(null);
              }}
              className="px-3.5 py-2 bg-accent text-white rounded-lg text-small font-semibold hover:bg-accent-hover transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
            >
              <Activity className="w-4 h-4" />
              <span>Ask Copilot about WO</span>
            </button>
            <button
              type="button"
              onClick={() => setInspectingOrder(null)}
              className="px-3.5 py-2 bg-panel border border-line text-body font-semibold rounded-lg text-small hover:bg-wash transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
