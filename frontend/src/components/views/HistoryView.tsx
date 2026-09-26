import { useState, useMemo } from "react";
import {
  Activity,
  AlertTriangle,
  BookOpen,
  Clock,
  Eye,
  FileText,
  RotateCcw,
  Search,
  Settings,
  User,
  Wrench,
  X
} from "lucide-react";
import type { EquipmentData } from "../visualization/OperatingHoursBarChart";

export interface HistoryEvent {
  id: string;
  time: string;
  type: "alarm" | "diagnostic" | "work_order" | "maintenance" | "status_change" | "sop" | "settings";
  assetId: string;
  assetName: string;
  description: string;
  user: string;
  status: string;
  payload?: Record<string, string>;
}

const DEMO_HISTORY: HistoryEvent[] = [
  {
    id: "EVT-9081",
    time: "Today 14:32",
    type: "alarm",
    assetId: "EQ-1000",
    assetName: "ApexMill-500",
    description: "Trip alarm E-308 (Inverter Bus Undervoltage) triggered",
    user: "Telemetry Monitor",
    status: "Active",
    payload: {
      "Trigger Metric": "DC Bus Voltage = 485 V (Threshold < 520 V)",
      "Fault Code": "E-308",
      "Severity": "Critical",
      "Corrective Action": "Check DC link capacitor ESR and pre-charge relay"
    }
  },
  {
    id: "EVT-9080",
    time: "Today 14:15",
    type: "diagnostic",
    assetId: "EQ-1000",
    assetName: "ApexMill-500",
    description: "AI Diagnostic executed: identified DC link pre-charge degradation",
    user: "David Chen",
    status: "Completed",
    payload: {
      "Model": "Gemini RAG Diagnostic Agent",
      "Root Cause Probability": "88% Capacitor Degradation",
      "Recommended SOP": "SOP-ELE-104 (Inverter Diagnostics)"
    }
  },
  {
    id: "EVT-9079",
    time: "Today 11:20",
    type: "work_order",
    assetId: "EQ-1003",
    assetName: "HydroPress-500",
    description: "WO-1023 created for hydraulic cylinder seal inspection",
    user: "Marcus Wong",
    status: "In Progress",
    payload: {
      "Work Order": "WO-1023",
      "Priority": "High",
      "Estimated Downtime": "2.5 Hours",
      "Assigned Tech": "Marcus Wong"
    }
  },
  {
    id: "EVT-9078",
    time: "Today 09:45",
    type: "sop",
    assetId: "EQ-1000",
    assetName: "ApexMill-500",
    description: "SOP-ELE-104 (Inverter Diagnostics) opened by technician",
    user: "David Chen",
    status: "Logged",
    payload: {
      "Document": "sop_inverter_bus.md",
      "Section": "LOTO & Discharge Verification",
      "Access Mode": "Interactive Viewer"
    }
  },
  {
    id: "EVT-9077",
    time: "Yesterday 16:10",
    type: "maintenance",
    assetId: "EQ-1005",
    assetName: "AeroLathe-Pro",
    description: "Completed 250h maintenance and lube top-up",
    user: "Alex Rodriguez",
    status: "Resolved",
    payload: {
      "Hours at Service": "14,240 h",
      "Replaced Part": "Coolant Filter Cartridge (FLT-COOL-25)",
      "Next Service": "In 250 h"
    }
  },
  {
    id: "EVT-9076",
    time: "Yesterday 13:00",
    type: "status_change",
    assetId: "EQ-2001",
    assetName: "Yamaha-YSM20R",
    description: "Machine state changed from Maintenance to Operational",
    user: "Sarah Jenkins",
    status: "Logged",
    payload: {
      "Previous State": "Maintenance",
      "New State": "Operational",
      "Verification": "Pick-and-place nozzle calibration passed"
    }
  },
  {
    id: "EVT-9075",
    time: "Sep 24, 2026",
    type: "settings",
    assetId: "All",
    assetName: "Plant Network",
    description: "Telemetry sampling threshold adjusted (+2.5°C)",
    user: "Luqman (Supervisor)",
    status: "Applied",
    payload: {
      "Parameter": "Spindle Temp Warning Ceiling",
      "Old Limit": "62.5 °C",
      "New Limit": "65.0 °C"
    }
  }
];

export interface HistoryViewProps {
  equipment?: EquipmentData[];
  onOpenAsset?: (machineId: string) => void;
}

export function HistoryView({ onOpenAsset }: HistoryViewProps = {}) {
  const [timeRange, setTimeRange] = useState<"today" | "7d" | "30d" | "all">("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<HistoryEvent | null>(null);

  const filteredHistory = useMemo(() => {
    return DEMO_HISTORY.filter((evt) => {
      const matchType = typeFilter === "all" || evt.type === typeFilter;
      const matchSearch =
        !search.trim() ||
        evt.description.toLowerCase().includes(search.toLowerCase()) ||
        evt.assetId.toLowerCase().includes(search.toLowerCase()) ||
        evt.assetName.toLowerCase().includes(search.toLowerCase()) ||
        evt.user.toLowerCase().includes(search.toLowerCase());
      return matchType && matchSearch;
    });
  }, [typeFilter, search]);

  const renderEventIcon = (type: HistoryEvent["type"]) => {
    switch (type) {
      case "alarm":
        return <AlertTriangle className="w-3.5 h-3.5 text-danger" />;
      case "diagnostic":
        return <Activity className="w-3.5 h-3.5 text-accent" />;
      case "work_order":
        return <FileText className="w-3.5 h-3.5 text-warn" />;
      case "maintenance":
        return <Wrench className="w-3.5 h-3.5 text-success" />;
      case "sop":
        return <BookOpen className="w-3.5 h-3.5 text-accent" />;
      case "settings":
        return <Settings className="w-3.5 h-3.5 text-muted" />;
      default:
        return <Clock className="w-3.5 h-3.5 text-muted" />;
    }
  };

  const getEventBadge = (type: HistoryEvent["type"]) => {
    switch (type) {
      case "alarm":
        return "bg-danger-bg text-danger-ink border-danger-line";
      case "diagnostic":
        return "bg-accent-bg text-accent-ink border-accent-line";
      case "work_order":
        return "bg-warn-bg text-warn-ink border-warn-line";
      case "maintenance":
        return "bg-success-bg text-success-ink border-success-line";
      case "sop":
        return "bg-accent-bg text-accent-ink border-accent-line";
      case "settings":
        return "bg-sunken text-body border-line";
      default:
        return "bg-wash text-muted border-line";
    }
  };

  return (
    <div className="h-full w-full max-w-[1680px] mx-auto flex flex-col bg-panel rounded-xl border border-line-strong/70 shadow-[var(--shadow-cockpit)] overflow-hidden animate-fade-in relative">
      {/* Streamlined Header */}
      <div className="p-4 sm:px-5 sm:py-4 border-b border-line flex flex-wrap items-center justify-between gap-3 bg-panel">
        <div className="flex items-center gap-3">
          <h1 className="text-[24px] sm:text-[28px] font-bold text-ink tracking-tight">Event History</h1>
          <span className="text-meta font-mono font-medium px-2 py-0.5 bg-sunken border border-line rounded-md text-muted tabular-nums">
            {filteredHistory.length} Events
          </span>
        </div>

        <div className="flex items-center gap-1 bg-sunken p-1 rounded-lg border border-line">
          {(["today", "7d", "30d", "all"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setTimeRange(r)}
              className={`px-3 py-1 rounded-md text-meta font-medium capitalize transition-colors cursor-pointer ${
                timeRange === r ? "bg-panel text-ink shadow-xs font-semibold" : "text-muted hover:text-ink"
              }`}
            >
              {r === "7d" ? "7 Days" : r === "30d" ? "30 Days" : r}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="px-4 sm:px-5 py-2.5 bg-sunken/60 border-b border-line flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events, assets, actors…"
            className="w-full pl-9 pr-3 py-1.5 bg-panel border border-line-strong rounded-lg text-small text-ink placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-accent transition-shadow"
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-1.5 bg-panel border border-line-strong rounded-lg text-small text-ink focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer"
        >
          <option value="all">All Types</option>
          <option value="alarm">Alarms</option>
          <option value="diagnostic">Diagnostics</option>
          <option value="work_order">Work Orders</option>
          <option value="maintenance">Maintenance</option>
          <option value="sop">SOP Views</option>
          <option value="settings">System Changes</option>
        </select>

        {(search || typeFilter !== "all") && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setTypeFilter("all");
            }}
            className="px-2.5 py-1 text-meta text-muted hover:text-ink inline-flex items-center gap-1 rounded-md hover:bg-wash transition-colors cursor-pointer ml-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Event Timeline Table */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 z-10 bg-sunken border-b border-line text-label font-semibold text-muted tracking-wide">
            <tr>
              <th className="py-2.5 px-4">Time</th>
              <th className="py-2.5 px-3">Type</th>
              <th className="py-2.5 px-3">Asset</th>
              <th className="py-2.5 px-3">Event Description</th>
              <th className="py-2.5 px-3">Actor</th>
              <th className="py-2.5 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line text-small">
            {filteredHistory.map((evt) => (
              <tr
                key={evt.id}
                onClick={() => setSelectedEvent(evt)}
                className="hover:bg-sunken group transition-colors duration-100 cursor-pointer"
              >
                <td className="py-3 px-4 font-mono text-meta font-medium text-body whitespace-nowrap tabular-nums">
                  {evt.time}
                </td>

                <td className="py-3 px-3">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-label font-semibold border ${getEventBadge(
                      evt.type
                    )}`}
                  >
                    {renderEventIcon(evt.type)}
                    <span className="capitalize">{evt.type.replace("_", " ")}</span>
                  </span>
                </td>

                <td className="py-3 px-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenAsset?.(evt.assetId);
                    }}
                    className="text-left group/btn cursor-pointer"
                  >
                    <div className="font-semibold text-ink group-hover/btn:text-accent transition-colors">{evt.assetName}</div>
                    <div className="font-mono text-label text-muted tabular-nums">{evt.assetId}</div>
                  </button>
                </td>

                <td className="py-3 px-3 font-medium text-ink max-w-lg">
                  {evt.description}
                </td>

                <td className="py-3 px-3 text-meta text-body">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-subtle" />
                    <span>{evt.user}</span>
                  </div>
                </td>

                <td className="py-3 px-4 text-right">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedEvent(evt);
                    }}
                    className="px-2.5 py-1 text-meta font-medium text-accent hover:bg-accent-bg rounded-md transition-colors inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Interactive Forensic Event Detail Slide-Over */}
      {selectedEvent && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="event-detail-title"
          className="absolute inset-y-0 right-0 w-full max-w-md bg-panel border-l border-line shadow-2xl z-20 flex flex-col animate-slide-in"
        >
          <div className="p-4 border-b border-line flex items-center justify-between bg-sunken/40">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-label font-semibold border ${getEventBadge(selectedEvent.type)}`}>
                {renderEventIcon(selectedEvent.type)}
                <span className="capitalize">{selectedEvent.type.replace("_", " ")}</span>
              </span>
              <span className="font-mono text-label text-muted">{selectedEvent.id}</span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedEvent(null)}
              aria-label="Close event inspector"
              className="p-1 rounded-md text-muted hover:text-ink hover:bg-wash transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
            <div>
              <h2 id="event-detail-title" className="text-section font-bold text-ink leading-tight">
                {selectedEvent.description}
              </h2>
              <div className="flex items-center gap-3 text-meta text-muted mt-2">
                <span className="font-mono">{selectedEvent.time}</span>
                <span>•</span>
                <span>Actor: <strong className="text-ink font-semibold">{selectedEvent.user}</strong></span>
              </div>
            </div>

            {/* Target Asset Identity */}
            <div className="p-3.5 rounded-xl border border-line bg-sunken/40 flex items-center justify-between">
              <div>
                <span className="text-label text-muted font-medium">Target Equipment</span>
                <div className="font-bold text-ink text-small mt-0.5">{selectedEvent.assetName}</div>
                <div className="font-mono text-label text-muted">{selectedEvent.assetId}</div>
              </div>
              {selectedEvent.assetId !== "All" && onOpenAsset && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenAsset(selectedEvent.assetId);
                    setSelectedEvent(null);
                  }}
                  className="px-3 py-1.5 bg-accent text-white rounded-lg text-small font-semibold hover:bg-accent-hover transition-colors shadow-2xs cursor-pointer"
                >
                  Inspect Asset
                </button>
              )}
            </div>

            {/* Forensic Payload Parameters */}
            {selectedEvent.payload && (
              <div className="space-y-2">
                <span className="text-label font-bold uppercase tracking-wider text-muted font-mono">
                  Forensic Telemetry Data
                </span>
                <div className="rounded-xl border border-line bg-panel divide-y divide-line overflow-hidden">
                  {Object.entries(selectedEvent.payload).map(([key, val]) => (
                    <div key={key} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-meta">
                      <span className="text-muted font-medium">{key}</span>
                      <span className="font-mono font-semibold text-ink text-right">{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-line bg-sunken/30 flex justify-end">
            <button
              type="button"
              onClick={() => setSelectedEvent(null)}
              className="px-4 py-2 bg-panel border border-line-strong text-body font-semibold rounded-lg text-small hover:bg-wash transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
