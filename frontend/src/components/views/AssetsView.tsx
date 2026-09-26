import { useState, useMemo, useRef } from "react";
import {
  Activity,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Layers,
  MapPin,
  RotateCcw,
  Search,
  Send,
  Sparkles,
  Wrench
} from "lucide-react";
import type { EquipmentData } from "../visualization/OperatingHoursBarChart";
import { statusMeta } from "../workspace/types";
import { EquipmentSchematicIcon } from "../workspace/EquipmentSchematicIcon";
import { ConversationThread } from "../workspace/ConversationThread";
import type { Message, Citation } from "../workspace/types";
import type { AuthUser } from "../../api/auth";

interface AssetsViewProps {
  equipment: EquipmentData[];
  selectedId: string | null;
  onSelectAsset: (machineId: string) => void;
  onOpenAssetDetail: (machineId: string) => void;
  onQuickDiagnose: (machineId: string) => void;
  chatMessages: Message[];
  chatLoading: boolean;
  onSendMessage: (query: string) => void;
  onResetChat: () => void;
  onOpenCitation: (c: Citation) => void;
  currentUser: AuthUser | null;
  onOpenAuth: () => void;
  apiBase: string;
}

export function AssetsView({
  equipment,
  selectedId,
  onSelectAsset,
  onOpenAssetDetail,
  onQuickDiagnose,
  chatMessages,
  chatLoading,
  onSendMessage,
  onResetChat,
  onOpenCitation,
  currentUser,
  onOpenAuth,
  apiBase
}: AssetsViewProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [copilotInput, setCopilotInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const counts = useMemo(() => {
    const total = equipment.length;
    const running = equipment.filter((e) => e.status.toLowerCase() === "operational").length;
    const fault = equipment.filter((e) => e.status.toLowerCase() === "fault").length;
    const maint = equipment.filter((e) => e.status.toLowerCase() === "maintenance").length;
    return { total, running, fault, maint };
  }, [equipment]);

  const uniqueLocations = useMemo(() => {
    const set = new Set<string>();
    equipment.forEach((e) => {
      if (e.location) set.add(e.location);
    });
    return Array.from(set);
  }, [equipment]);

  const filteredEquipment = useMemo(() => {
    return equipment.filter((item) => {
      const matchSearch =
        !search.trim() ||
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.machine_id.toLowerCase().includes(search.toLowerCase()) ||
        item.type.toLowerCase().includes(search.toLowerCase());
      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "running" && item.status.toLowerCase() === "operational") ||
        (statusFilter === "fault" && item.status.toLowerCase() === "fault") ||
        (statusFilter === "maintenance" && item.status.toLowerCase() === "maintenance");
      const matchLocation = locationFilter === "all" || item.location === locationFilter;
      return matchSearch && matchStatus && matchLocation;
    });
  }, [equipment, search, statusFilter, locationFilter]);

  const handleSendPrompt = (prompt: string) => {
    if (!prompt.trim() || chatLoading) return;
    onSendMessage(prompt);
    setCopilotInput("");
  };

  const selectedMachine = equipment.find((e) => e.machine_id === selectedId) ?? equipment[0] ?? null;

  return (
    <div className="h-full w-full flex flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px] gap-3.5 lg:gap-4 overflow-hidden animate-fade-in">
      {/* Main Asset Table Area (~70-75%) */}
      <div className="flex-1 min-w-0 flex flex-col bg-panel rounded-xl border border-line-strong/70 shadow-[var(--shadow-cockpit)] overflow-hidden">
        {/* Streamlined Header */}
        <div className="p-4 sm:px-5 sm:py-4 border-b border-line flex flex-wrap items-center justify-between gap-3 bg-panel">
          <div className="flex items-center gap-3">
            <h1 className="text-[24px] sm:text-[28px] font-bold text-ink tracking-tight">Assets</h1>
            <span className="text-meta font-mono font-medium px-2 py-0.5 bg-sunken border border-line rounded-md text-muted tabular-nums">
              {filteredEquipment.length} of {equipment.length}
            </span>
          </div>

          {/* Icon-driven Quick Filters */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === "running" ? "all" : "running")}
              className={`px-3 py-1.5 rounded-lg text-small font-medium border flex items-center gap-1.5 transition-all duration-150 cursor-pointer ${
                statusFilter === "running"
                  ? "bg-success-bg border-success-line text-success-ink font-semibold shadow-xs"
                  : "bg-panel border-line text-muted hover:text-ink hover:bg-sunken"
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-success" />
              <span className="tabular-nums">{counts.running} Running</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === "fault" ? "all" : "fault")}
              className={`px-3 py-1.5 rounded-lg text-small font-medium border flex items-center gap-1.5 transition-all duration-150 cursor-pointer ${
                statusFilter === "fault"
                  ? "bg-danger-bg border-danger-line text-danger-ink font-semibold shadow-xs"
                  : "bg-panel border-line text-muted hover:text-ink hover:bg-sunken"
              }`}
            >
              <AlertTriangle className="w-4 h-4 text-danger" />
              <span className="tabular-nums">{counts.fault} Fault</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === "maintenance" ? "all" : "maintenance")}
              className={`px-3 py-1.5 rounded-lg text-small font-medium border flex items-center gap-1.5 transition-all duration-150 cursor-pointer ${
                statusFilter === "maintenance"
                  ? "bg-warn-bg border-warn-line text-warn-ink font-semibold shadow-xs"
                  : "bg-panel border-line text-muted hover:text-ink hover:bg-sunken"
              }`}
            >
              <Clock className="w-4 h-4 text-warn" />
              <span className="tabular-nums">{counts.maint} Maint</span>
            </button>
          </div>
        </div>

        {/* Fluid Filter Toolbar */}
        <div className="px-4 sm:px-5 py-2.5 bg-sunken/60 border-b border-line flex flex-wrap items-center gap-2.5 text-small">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search assets or IDs…"
              className="w-full pl-9 pr-3 py-1.5 bg-panel border border-line-strong rounded-lg text-small text-ink placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-accent transition-shadow"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-panel border border-line-strong rounded-lg text-small text-ink focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="running">Running</option>
            <option value="fault">Fault</option>
            <option value="maintenance">Maintenance</option>
          </select>

          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="px-3 py-1.5 bg-panel border border-line-strong rounded-lg text-small text-ink focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer"
          >
            <option value="all">All Locations</option>
            {uniqueLocations.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>

          {(search || statusFilter !== "all" || locationFilter !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
                setLocationFilter("all");
              }}
              className="px-2.5 py-1.5 text-meta font-medium text-muted hover:text-ink inline-flex items-center gap-1 rounded-md hover:bg-wash transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Clean, Icon-Header Table */}
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-sunken border-b border-line text-label font-semibold text-muted tracking-wide">
              <tr>
                <th scope="col" className="py-2.5 px-4">
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-subtle" />
                    <span>Asset</span>
                  </div>
                </th>
                <th scope="col" className="py-2.5 px-3">Asset ID</th>
                <th scope="col" className="py-2.5 px-3">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-subtle" />
                    <span>Location</span>
                  </div>
                </th>
                <th scope="col" className="py-2.5 px-3">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-subtle" />
                    <span>Hours</span>
                  </div>
                </th>
                <th scope="col" className="py-2.5 px-3">
                  <div className="flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-subtle" />
                    <span>Status</span>
                  </div>
                </th>
                <th scope="col" className="py-2.5 px-3">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-subtle" />
                    <span>Next Service</span>
                  </div>
                </th>
                <th scope="col" className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-small">
              {filteredEquipment.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted">
                    No matching assets.
                  </td>
                </tr>
              ) : (
                filteredEquipment.map((item) => {
                  const meta = statusMeta(item.status);
                  const isFault = item.status.toLowerCase() === "fault";
                  const isMaint = item.status.toLowerCase() === "maintenance";
                  const isSelected = item.machine_id === selectedId;

                  return (
                    <tr
                      key={item.machine_id}
                      onClick={() => onSelectAsset(item.machine_id)}
                      className={`group transition-colors duration-100 cursor-pointer ${
                        isSelected
                          ? "bg-accent-bg/70 hover:bg-accent-bg"
                          : isFault
                          ? "bg-danger-bg/40 hover:bg-danger-bg/60"
                          : isMaint
                          ? "bg-warn-bg/30 hover:bg-warn-bg/50"
                          : "hover:bg-sunken"
                      }`}
                    >
                      {/* Asset */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-wash flex items-center justify-center shrink-0 border border-line">
                            <EquipmentSchematicIcon type={item.type} className="w-5 h-5 text-body" />
                          </div>
                          <div>
                            <div className="font-semibold text-ink group-hover:text-accent transition-colors">
                              {item.name}
                            </div>
                            <div className="text-label text-muted">{item.type}</div>
                          </div>
                        </div>
                      </td>

                      {/* Asset ID */}
                      <td className="py-3 px-3">
                        <span className="font-mono text-meta text-body font-medium px-2 py-0.5 bg-wash rounded border border-line/60 tabular-nums">
                          {item.machine_id}
                        </span>
                      </td>

                      {/* Location */}
                      <td className="py-3 px-3 text-muted">{item.location}</td>

                      {/* Operating Hours */}
                      <td className="py-3 px-3 font-mono font-medium text-ink tabular-nums">
                        {item.operating_hours ? `${item.operating_hours.toLocaleString()} h` : "—"}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
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
                      </td>

                      {/* Next Service */}
                      <td className="py-3 px-3 text-meta text-muted font-medium">
                        {item.operating_hours && item.operating_hours > 10000 ? (
                          <span className="text-danger font-semibold">Overdue</span>
                        ) : (
                          "In ~240 h"
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenAssetDetail(item.machine_id);
                            }}
                            className="px-2.5 py-1 text-meta font-semibold text-accent hover:bg-accent-bg rounded-md transition-colors"
                          >
                            Details
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onQuickDiagnose(item.machine_id);
                            }}
                            className="p-1 text-muted hover:text-ink hover:bg-wash rounded-md transition-colors"
                            title="Diagnostics"
                          >
                            <Wrench className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Copilot Assistant Panel (~25-30%) */}
      <div className="flex flex-col bg-panel rounded-xl border border-line-strong/70 shadow-[var(--shadow-cockpit)] overflow-hidden">
        {/* Streamlined Panel Header */}
        <div className="p-3.5 sm:px-4 border-b border-line flex items-center justify-between bg-sunken/40">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-accent/10 text-accent flex items-center justify-center border border-accent-line/40">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-small text-ink">Copilot Assistant</span>
          </div>
          <button
            type="button"
            onClick={onResetChat}
            className="px-2 py-0.5 rounded text-subtle hover:text-ink hover:bg-wash transition-colors text-label font-medium cursor-pointer"
          >
            Clear
          </button>
        </div>

        {/* Selected asset context chip */}
        {selectedMachine && (
          <div className="px-3.5 py-2 bg-wash/70 border-b border-line text-label flex items-center justify-between">
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-muted">Target:</span>
              <span className="font-semibold text-ink truncate">{selectedMachine.name}</span>
              <span className="font-mono text-muted tabular-nums">({selectedMachine.machine_id})</span>
            </div>
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                selectedMachine.status.toLowerCase() === "fault"
                  ? "bg-status-fault"
                  : selectedMachine.status.toLowerCase() === "maintenance"
                  ? "bg-status-maint"
                  : "bg-status-ok"
              }`}
            />
          </div>
        )}

        {/* Conversation or Punchy Icon Starter Prompts */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-3 custom-scrollbar">
          {chatMessages.length === 0 ? (
            <div className="space-y-3 pt-1">
              <p className="text-label font-semibold text-muted uppercase tracking-wider font-mono">Quick Inquiries</p>
              <div className="space-y-2">
                {[
                  {
                    icon: AlertTriangle,
                    color: "text-danger-ink bg-danger-bg border-danger-line",
                    title: "Active Alarms",
                    text: `Show assets currently in fault state`
                  },
                  {
                    icon: Clock,
                    color: "text-warn-ink bg-warn-bg border-warn-line",
                    title: "Service Interval",
                    text: `Next scheduled service for ${selectedMachine?.name || "ApexMill-500"}`
                  },
                  {
                    icon: Wrench,
                    color: "text-accent-ink bg-accent-bg border-accent-line",
                    title: "Fault History",
                    text: `Open work orders for ${selectedMachine?.machine_id || "EQ-1000"}`
                  },
                  {
                    icon: Layers,
                    color: "text-success-ink bg-success-bg border-success-line",
                    title: "Safety SOP",
                    text: `Show coolant and spindle maintenance procedure`
                  }
                ].map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSendPrompt(item.text)}
                      className="w-full text-left p-2.5 rounded-lg border border-line hover:border-accent hover:bg-accent-bg/40 transition-all duration-150 group flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <div className={`w-7 h-7 rounded-md ${item.color} border flex items-center justify-center shrink-0`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-small font-semibold text-ink group-hover:text-accent transition-colors">{item.title}</div>
                          <div className="text-label text-muted truncate">{item.text}</div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-subtle group-hover:text-accent group-hover:translate-x-0.5 transition-all shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <ConversationThread
              messages={chatMessages}
              loading={chatLoading}
              chatEndRef={chatEndRef}
              currentUser={currentUser}
              apiBase={apiBase}
              onOpenAuth={onOpenAuth}
              onNewConversation={onResetChat}
              onOpenCitation={onOpenCitation}
              assetName={selectedMachine?.name}
              suggestions={[]}
            />
          )}
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-line bg-panel">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendPrompt(copilotInput);
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={copilotInput}
              onChange={(e) => setCopilotInput(e.target.value)}
              placeholder={`Ask about ${selectedMachine?.name || "equipment"}…`}
              disabled={chatLoading}
              className="flex-1 px-3 py-2 bg-sunken border border-line-strong rounded-lg text-small text-ink placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-accent transition-shadow"
            />
            <button
              type="submit"
              disabled={!copilotInput.trim() || chatLoading}
              aria-label="Send message"
              className="h-9 w-9 rounded-lg bg-accent text-white flex items-center justify-center hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0 cursor-pointer shadow-xs"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
