import { useState, useEffect, useRef } from "react";
import {
  Cpu,
  ShieldCheck,
  Send,
  RotateCcw,
  Search,
  PanelRightClose,
  PanelRightOpen,
  Wrench,
  Clock,
  User,
  AlertTriangle,
  ArrowRight,
  Activity,
  SlidersHorizontal,
  FileText
} from "lucide-react";
import { AgentWorkflowDag, type WorkflowStep } from "./components/visualization/AgentWorkflowDag";
import type { EquipmentData } from "./components/visualization/OperatingHoursBarChart";

interface Citation {
  source?: string;
  document?: string;
  page?: number | string;
  snippet?: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  workflow_trace?: WorkflowStep[];
  citations?: Citation[];
  abstain?: boolean;
}

interface Stats {
  equipment_count: number;
  maintenance_logs_count: number;
  indexed_chunks: number;
  llm_model: string;
  embedding_model: string;
}

interface WorkOrderLog {
  id: number;
  machine_id: string;
  fault_code: string;
  fault_description: string;
  action_taken: string;
  technician: string;
  started_at: string;
  completed_at: string;
  duration_mins: number;
  parts_replaced: string;
  severity: string;
}

const API_BASE = "http://localhost:8000";

// Resilient default fleet assets ensuring the console is never blank during loading
const DEFAULT_EQUIPMENT: EquipmentData[] = [
  {
    machine_id: "EQ-1000",
    name: "ApexMill-500",
    type: "5-Axis CNC Mill",
    location: "Cell A-1",
    status: "fault",
    operating_hours: 12450,
    criticality: "critical"
  },
  {
    machine_id: "EQ-1001",
    name: "RoboArm-X2",
    type: "Articulated Welder",
    location: "Cell B-3",
    status: "operational",
    operating_hours: 4120,
    criticality: "high"
  },
  {
    machine_id: "EQ-1002",
    name: "LaserCut-9000",
    type: "Fiber Laser Cutter",
    location: "Cell C-2",
    status: "operational",
    operating_hours: 8750,
    criticality: "medium"
  },
  {
    machine_id: "EQ-1003",
    name: "HydroPress-500",
    type: "Hydraulic Press",
    location: "Cell A-4",
    status: "operational",
    operating_hours: 6300,
    criticality: "high"
  },
  {
    machine_id: "EQ-1004",
    name: "TitanPress-3000",
    type: "Stamping Press",
    location: "Cell A-2",
    status: "maintenance",
    operating_hours: 9820,
    criticality: "critical"
  },
  {
    machine_id: "EQ-1005",
    name: "AeroLathe-Pro",
    type: "Precision Lathe",
    location: "Cell B-1",
    status: "operational",
    operating_hours: 3400,
    criticality: "medium"
  },
  {
    machine_id: "EQ-1006",
    name: "Plasmavolt-X",
    type: "Plasma Cutter",
    location: "Cell C-1",
    status: "operational",
    operating_hours: 7100,
    criticality: "medium"
  },
  {
    machine_id: "EQ-1007",
    name: "ThermoFurnace-80",
    type: "Induction Furnace",
    location: "Cell D-1",
    status: "operational",
    operating_hours: 11200,
    criticality: "critical"
  },
  {
    machine_id: "EQ-1008",
    name: "FlowPump-V12",
    type: "Coolant Pump Station",
    location: "Cell D-3",
    status: "operational",
    operating_hours: 5600,
    criticality: "high"
  },
  {
    machine_id: "EQ-1009",
    name: "ConveyorBelt-C3",
    type: "Assembly Line Transport",
    location: "Cell B-2",
    status: "operational",
    operating_hours: 8900,
    criticality: "low"
  }
];

const DEFAULT_LOGS_EQ1000: WorkOrderLog[] = [
  {
    id: 1,
    machine_id: "EQ-1000",
    fault_code: "E-402",
    fault_description: "Spindle thermal overload tripped at 92°C during high-speed finishing cycle.",
    action_taken: "Flushed secondary coolant heat exchanger and replaced RTD temperature sensor.",
    technician: "Marcus Vance",
    started_at: "2026-03-14 08:30",
    completed_at: "2026-03-14 09:45",
    duration_mins: 75,
    parts_replaced: "RTD-2 Thermistor Sensor, O-Ring Seal Kit",
    severity: "critical"
  },
  {
    id: 2,
    machine_id: "EQ-1000",
    fault_code: "M-104",
    fault_description: "High vibration detected on Z-axis ball screw drive.",
    action_taken: "Re-torqued mounting brackets, purged grease lines, verified runout at 0.003mm.",
    technician: "Sarah Chen",
    started_at: "2026-02-28 14:15",
    completed_at: "2026-02-28 15:00",
    duration_mins: 45,
    parts_replaced: "None (Lubrication & alignment)",
    severity: "medium"
  }
];

// Lightweight formatter for bold, code blocks, and structured lists
function FormattedContent({ content }: { content: string }) {
  const paragraphs = content.split("\n\n");

  return (
    <div className="space-y-3 leading-relaxed text-[13.5px] text-[#2F3437]">
      {paragraphs.map((para, pIdx) => {
        // Bullet list item
        if (para.trim().startsWith("- ") || para.trim().startsWith("* ")) {
          const lines = para.split("\n");
          return (
            <ul key={pIdx} className="space-y-1.5 pl-4 list-disc marker:text-[#787774]">
              {lines.map((line, lIdx) => {
                const cleanLine = line.replace(/^[-*]\s+/, "");
                return (
                  <li key={lIdx} className="pl-1">
                    {renderInlineFormatted(cleanLine)}
                  </li>
                );
              })}
            </ul>
          );
        }

        // Ordered numbered list
        if (/^\d+\.\s+/.test(para.trim())) {
          const lines = para.split("\n");
          return (
            <ol key={pIdx} className="space-y-1.5 pl-5 list-decimal marker:text-[#787774] marker:font-mono marker:text-xs">
              {lines.map((line, lIdx) => {
                const cleanLine = line.replace(/^\d+\.\s+/, "");
                return (
                  <li key={lIdx} className="pl-1">
                    {renderInlineFormatted(cleanLine)}
                  </li>
                );
              })}
            </ol>
          );
        }

        return <p key={pIdx}>{renderInlineFormatted(para)}</p>;
      })}
    </div>
  );
}

function renderInlineFormatted(text: string) {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-semibold text-[#111111]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={index}
          className="px-1.5 py-0.5 rounded bg-[#F4F4F2] border border-[#EAEAEA] font-mono text-xs text-[#111111]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "**Industrial AI Maintenance Copilot Online.**\n\nCoordinating specialist agents across 560+ maintenance records, equipment health telemetry, and OEM technical manuals.\n\nSelect an equipment asset from the Fleet Register or trigger a diagnostic query below.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      workflow_trace: [
        {
          agent: "supervisor",
          action: "system_initialized",
          summary: "Multi-agent LangGraph orchestrator ready."
        }
      ]
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<Stats | null>({
    equipment_count: 10,
    maintenance_logs_count: 560,
    indexed_chunks: 142,
    llm_model: "qwen2.5:7b",
    embedding_model: "BAAI/bge-large-en-v1.5"
  });
  const [equipmentList, setEquipmentList] = useState<EquipmentData[]>(DEFAULT_EQUIPMENT);
  const [selectedMachineId, setSelectedMachineId] = useState<string>("EQ-1000");
  const [searchFilter, setSearchFilter] = useState("");
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);
  const [machineLogs, setMachineLogs] = useState<WorkOrderLog[]>(DEFAULT_LOGS_EQ1000);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Sync stats and equipment from API
  useEffect(() => {
    fetch(`${API_BASE}/api/stats`)
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch((err) => console.log("Using cached stats (API offline):", err.message));

    fetch(`${API_BASE}/api/equipment`)
      .then((res) => res.json())
      .then((data) => {
        if (data.equipment && data.equipment.length > 0) {
          setEquipmentList(data.equipment);
        }
      })
      .catch((err) => console.log("Using cached fleet catalog (API offline):", err.message));
  }, []);

  // Sync machine history logs
  useEffect(() => {
    if (!selectedMachineId) return;
    let ignore = false;

    fetch(`${API_BASE}/api/equipment/${selectedMachineId}/history`)
      .then((res) => res.json())
      .then((data) => {
        if (!ignore && data.logs && data.logs.length > 0) {
          setMachineLogs(data.logs);
          setLoadingLogs(false);
        }
      })
      .catch(() => {
        if (!ignore) setLoadingLogs(false);
      });

    return () => {
      ignore = true;
    };
  }, [selectedMachineId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim() || loading) return;

    const userMsg: Message = {
      role: "user",
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput("");
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: query })
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const data = await response.json();
      const botMsg: Message = {
        role: "assistant",
        content: data.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        workflow_trace: data.workflow_trace || [],
        citations: data.citations || [],
        abstain: data.abstain || false
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const errorMsg: Message = {
        role: "assistant",
        content: `Communication error with backend API: ${err.message}. Please verify FastAPI is running on ${API_BASE}.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        abstain: true
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "operational":
        return {
          label: "Operational",
          bg: "bg-[#EDF3EC]",
          text: "text-[#346538]",
          border: "border-[#346538]/20"
        };
      case "fault":
        return {
          label: "Fault",
          bg: "bg-[#FDEBEC]",
          text: "text-[#9F2F2D]",
          border: "border-[#9F2F2D]/20"
        };
      case "maintenance":
        return {
          label: "Maintenance",
          bg: "bg-[#FBF3DB]",
          text: "text-[#956400]",
          border: "border-[#956400]/20"
        };
      default:
        return {
          label: status,
          bg: "bg-[#F4F4F2]",
          text: "text-[#787774]",
          border: "border-[#EAEAEA]"
        };
    }
  };

  const filteredEquipment = equipmentList.filter(
    (eq) =>
      eq.machine_id.toLowerCase().includes(searchFilter.toLowerCase()) ||
      eq.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      eq.location.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const selectedMachine =
    equipmentList.find((e) => e.machine_id === selectedMachineId) || equipmentList[0];
  const OVERHAUL_THRESHOLD = 10000;
  const isOverhaulNeeded = selectedMachine ? selectedMachine.operating_hours >= OVERHAUL_THRESHOLD : false;

  return (
    <div className="flex flex-col h-screen w-screen bg-[#FBFBFA] text-[#111111] antialiased overflow-hidden font-sans">
      {/* Top Global Command Bar */}
      <header className="h-14 border-b border-[#EAEAEA] px-5 flex items-center justify-between bg-[#FFFFFF] shrink-0 z-20">
        <div className="flex items-center gap-4">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-[#111111] text-white flex items-center justify-center shadow-[0_1px_2px_rgba(0,0,0,0.1)]">
              <Cpu className="w-4 h-4" strokeWidth={2.2} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-semibold text-sm tracking-tight text-[#111111]">
                  Industrial AI Copilot
                </h1>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono uppercase bg-[#F4F4F2] text-[#787774] border border-[#EAEAEA]">
                  Command Deck
                </span>
              </div>
              <p className="text-[10.5px] text-[#787774] flex items-center gap-1 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-[#346538]"></span>
                LangGraph Multi-Agent • 10 Fleet Units Online
              </p>
            </div>
          </div>

          <div className="h-5 w-[1px] bg-[#EAEAEA] hidden md:block" />

          {/* Plant Telemetry Status */}
          <div className="hidden lg:flex items-center gap-2 text-xs font-mono">
            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#EDF3EC] text-[#346538] border border-[#346538]/20">
              <span className="w-1.5 h-1.5 rounded-full bg-[#346538]"></span>
              Plant Uptime: 80%
            </span>
            <span className="px-2 py-0.5 rounded bg-[#FBFBFA] text-[#787774] border border-[#EAEAEA]">
              560+ Work Orders
            </span>
          </div>
        </div>

        {/* Right Tools & Inspector Toggle */}
        <div className="flex items-center gap-2.5">
          {/* Hardware Telemetry Badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#FBFBFA] border border-[#EAEAEA] font-mono text-[11px] text-[#787774]">
            <Activity className="w-3 h-3 text-[#346538]" />
            <span>RTX 3070 • Qwen2.5 7B</span>
          </div>

          {/* Toggle Inspector Pane */}
          <button
            type="button"
            onClick={() => setIsInspectorOpen((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-all active:scale-[0.98] ${
              isInspectorOpen
                ? "bg-[#111111] text-white border-[#111111]"
                : "bg-[#FFFFFF] text-[#787774] border-[#EAEAEA] hover:text-[#111111] hover:bg-[#F7F6F3]"
            }`}
            title="Toggle Contextual Telemetry Inspector"
          >
            {isInspectorOpen ? (
              <PanelRightClose className="w-3.5 h-3.5" />
            ) : (
              <PanelRightOpen className="w-3.5 h-3.5" />
            )}
            <span className="hidden md:inline">
              {isInspectorOpen ? "Hide Inspector" : "Show Inspector"}
            </span>
          </button>

          {/* Reset Conversation */}
          <button
            onClick={() => {
              setMessages([
                {
                  role: "assistant",
                  content:
                    "Diagnostic session reset. Select a machine from the Fleet Register or trigger a diagnostic query.",
                  timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                }
              ]);
            }}
            className="p-1.5 text-[#787774] hover:text-[#111111] hover:bg-[#F4F4F2] rounded-md transition-colors border border-transparent hover:border-[#EAEAEA]"
            title="Reset Chat Session"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main 3-Pane Unified Grid */}
      <div className="flex flex-1 overflow-hidden">
        {/* ================================================================ */}
        {/* PANE 1: Left Fleet Register (~250px)                             */}
        {/* ================================================================ */}
        <aside className="w-60 lg:w-68 border-r border-[#EAEAEA] bg-[#FFFFFF] flex flex-col justify-between shrink-0 select-none">
          {/* Fleet Header & Filter */}
          <div className="p-3 border-b border-[#EAEAEA] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#787774] uppercase tracking-wider font-mono">
                Fleet Register ({equipmentList.length})
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#EDF3EC] text-[#346538] border border-[#346538]/20 font-medium">
                8 Operational
              </span>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#787774]" />
              <input
                type="text"
                placeholder="Filter ID, model, bay..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full bg-[#FBFBFA] border border-[#EAEAEA] rounded-md pl-8 pr-2.5 py-1.5 text-xs text-[#111111] placeholder-[#787774] focus:outline-none focus:border-[#111111] focus:ring-1 focus:ring-[#111111] transition-all"
              />
            </div>
          </div>

          {/* Machine Fleet List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
            {filteredEquipment.map((eq) => {
              const badge = getStatusBadge(eq.status);
              const isSelected = selectedMachineId === eq.machine_id;

              return (
                <button
                  key={eq.machine_id}
                  type="button"
                  onClick={() => {
                    setSelectedMachineId(eq.machine_id);
                  }}
                  className={`w-full text-left p-2.5 rounded-md border transition-all text-xs flex flex-col gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] ${
                    isSelected
                      ? "bg-[#F7F6F3] border-[#111111] text-[#111111] shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                      : "bg-[#FFFFFF] border-[#EAEAEA] hover:border-[#CCCCCC] hover:bg-[#FBFBFA] text-[#2F3437]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#111111] font-mono">
                      {eq.machine_id}
                    </span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[9.5px] font-medium tracking-wide uppercase border ${badge.bg} ${badge.text} ${badge.border}`}
                    >
                      {badge.label}
                    </span>
                  </div>

                  <p className="text-[11.5px] text-[#787774] truncate font-normal">
                    {eq.name}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-[#787774] font-mono">
                    <span>{eq.location}</span>
                    <span className={eq.operating_hours >= OVERHAUL_THRESHOLD ? "text-[#9F2F2D] font-semibold" : ""}>
                      {eq.operating_hours.toLocaleString()} hrs
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Telemetry Summary Footer */}
          {stats && (
            <div className="p-3 border-t border-[#EAEAEA] bg-[#FBFBFA] text-[11px] text-[#787774] font-mono flex items-center justify-between">
              <span>{stats.equipment_count} Plant Assets</span>
              <span className="text-[#1F6C9F]">{stats.indexed_chunks} RAG Chunks</span>
            </div>
          )}
        </aside>

        {/* ================================================================ */}
        {/* PANE 2: Center Diagnostic Copilot Stage (Flex: 1)                */}
        {/* ================================================================ */}
        <main className="flex-1 flex flex-col h-full bg-[#FBFBFA] overflow-hidden">
          {/* Active Asset Operational Command Ribbon */}
          {selectedMachine && (
            <div className="border-b border-[#EAEAEA] bg-[#FFFFFF] px-5 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-[#111111] font-mono">
                    {selectedMachine.machine_id}
                  </span>
                  <span className="text-xs text-[#787774]">({selectedMachine.name})</span>
                  <span className="text-xs text-[#787774]">•</span>
                  <span className="text-xs font-mono text-[#787774]">{selectedMachine.location}</span>
                </div>

                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-medium tracking-wide uppercase border ${getStatusBadge(selectedMachine.status).bg} ${getStatusBadge(selectedMachine.status).text} ${getStatusBadge(selectedMachine.status).border}`}
                >
                  {selectedMachine.status}
                </span>

                <div className="hidden xl:flex items-center gap-2 text-xs text-[#787774] font-mono">
                  <span>Runtime: {selectedMachine.operating_hours.toLocaleString()} / 10,000 hrs</span>
                  {isOverhaulNeeded && (
                    <span className="text-[#9F2F2D] flex items-center gap-1 font-semibold">
                      <AlertTriangle className="w-3.5 h-3.5" /> Overhaul Overdue
                    </span>
                  )}
                </div>
              </div>

              {/* Instant 1-Click Operational Action Chips */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleSend(
                      `What does fault code E-402 mean on ${selectedMachine.name} (${selectedMachine.machine_id}) and what is the corrective procedure?`
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-[#FBFBFA] hover:bg-[#F4F4F2] border border-[#EAEAEA] text-[#111111] rounded text-xs font-mono transition-all active:scale-[0.98]"
                >
                  <Wrench className="w-3.5 h-3.5 text-[#1F6C9F]" />
                  <span>Check Alarm E-402</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleSend(
                      `Give me the step-by-step SOP and LOTO safety rules for replacing spindle bearings on ${selectedMachine.name}`
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-[#FBFBFA] hover:bg-[#F4F4F2] border border-[#EAEAEA] text-[#111111] rounded text-xs font-mono transition-all active:scale-[0.98]"
                >
                  <FileText className="w-3.5 h-3.5 text-[#346538]" />
                  <span>LOTO Safety SOP</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleSend(
                      `Investigate recurring faults and maintenance history for ${selectedMachine.machine_id} (${selectedMachine.name})`
                    )
                  }
                  className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-[#FBFBFA] hover:bg-[#F4F4F2] border border-[#EAEAEA] text-[#111111] rounded text-xs font-mono transition-all active:scale-[0.98]"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#956400]" />
                  <span>SQL Log Audit</span>
                </button>
              </div>
            </div>
          )}

          {/* Diagnostic Conversation Stream */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
            {messages.map((msg, idx) => {
              const isUser = msg.role === "user";

              return (
                <div
                  key={idx}
                  className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                >
                  <div className="flex items-center gap-2 mb-1 px-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#787774] font-mono">
                      {isUser ? "Maintenance Technician" : "Copilot Multi-Agent Core"}
                    </span>
                    <span className="text-[10px] text-[#A3A3A3] font-mono">
                      {msg.timestamp}
                    </span>
                  </div>

                  <div
                    className={`max-w-3xl rounded-md transition-all ${
                      isUser
                        ? "bg-[#18181B] text-white p-3.5 text-sm shadow-[0_1px_3px_rgba(0,0,0,0.08)] leading-relaxed"
                        : "bg-[#FFFFFF] border border-[#EAEAEA] p-4 text-sm shadow-[0_1px_2px_rgba(0,0,0,0.02)] text-[#111111] space-y-3 w-full"
                    }`}
                  >
                    {/* Multi-Agent DAG Visualizer (When steps are recorded) */}
                    {!isUser && msg.workflow_trace && msg.workflow_trace.length > 0 && (
                      <AgentWorkflowDag
                        workflowTrace={msg.workflow_trace}
                        isCompact={true}
                      />
                    )}

                    {/* Message Body */}
                    {isUser ? (
                      <div className="whitespace-pre-wrap font-normal text-[13.5px]">
                        {msg.content}
                      </div>
                    ) : (
                      <FormattedContent content={msg.content} />
                    )}

                    {/* Abstention Flag */}
                    {msg.abstain && (
                      <div className="mt-3 flex items-start gap-2.5 text-xs bg-[#FDEBEC] border border-[#9F2F2D]/20 text-[#9F2F2D] p-3 rounded-md">
                        <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={2.2} />
                        <div>
                          <p className="font-semibold">Deterministic Abstention Enforced</p>
                          <p className="text-[11.5px] mt-0.5 opacity-90">
                            Query resolved as outside verified industrial maintenance documentation or out of scope.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Loading Indicator */}
            {loading && (
              <div className="flex items-center gap-3 text-[#787774] text-xs p-3.5 bg-[#FFFFFF] border border-[#EAEAEA] rounded-md w-fit shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                <div className="w-3.5 h-3.5 border-2 border-[#111111] border-t-transparent rounded-full animate-spin"></div>
                <span className="font-mono">
                  Supervisor dispatching retrieval & SQL diagnostic specialists...
                </span>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Docked Console Input Bar */}
          <div className="p-3.5 border-t border-[#EAEAEA] bg-[#FFFFFF] shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2 max-w-4xl mx-auto"
            >
              <div className="relative flex-1">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={`Ask regarding ${selectedMachine ? selectedMachine.name : "machine"} alarms (e.g. E-402), SOP, or past work orders...`}
                  disabled={loading}
                  className="w-full bg-[#FBFBFA] border border-[#EAEAEA] rounded-md px-3.5 py-2.5 text-sm text-[#111111] placeholder-[#787774] focus:outline-none focus:bg-[#FFFFFF] focus:border-[#111111] focus:ring-1 focus:ring-[#111111] transition-all disabled:opacity-50"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#111111] hover:bg-[#262626] text-white rounded-md text-sm font-medium transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 shadow-[0_1px_2px_rgba(0,0,0,0.1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111]"
              >
                <span>Query</span>
                <Send className="w-3.5 h-3.5" strokeWidth={2.2} />
                <kbd className="hidden sm:inline-block font-mono text-[10px] px-1 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                  ↵
                </kbd>
              </button>
            </form>

            <div className="text-center mt-2 text-[10.5px] text-[#787774] font-mono">
              Deterministic Grounding • LangGraph StateGraph • FAISS Hybrid Vectors • Local Ollama
            </div>
          </div>
        </main>

        {/* ================================================================ */}
        {/* PANE 3: Contextual Inspector (Right ~340px, Persistent)          */}
        {/* ================================================================ */}
        {isInspectorOpen && selectedMachine && (
          <aside className="w-80 lg:w-92 border-l border-[#EAEAEA] bg-[#FFFFFF] flex flex-col justify-between shrink-0 select-none">
            {/* Inspector Header */}
            <div className="p-3.5 border-b border-[#EAEAEA] flex items-center justify-between bg-[#FBFBFA]">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#111111]" />
                <span className="font-semibold text-xs uppercase tracking-wider text-[#111111] font-mono">
                  Telemetry Inspector
                </span>
              </div>
              <span className="text-[10px] font-mono text-[#787774]">
                Asset: {selectedMachine.machine_id}
              </span>
            </div>

            {/* Inspector Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {/* Machine Specs 2x2 Bento Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded bg-[#FBFBFA] border border-[#EAEAEA]">
                  <span className="text-[10px] text-[#787774] uppercase font-mono block">
                    Model & Type
                  </span>
                  <span className="font-semibold text-[#111111] mt-0.5 block truncate">
                    {selectedMachine.name}
                  </span>
                  <span className="text-[10px] text-[#787774] block font-mono">
                    {selectedMachine.type}
                  </span>
                </div>

                <div className="p-2.5 rounded bg-[#FBFBFA] border border-[#EAEAEA]">
                  <span className="text-[10px] text-[#787774] uppercase font-mono block">
                    Location Bay
                  </span>
                  <span className="font-semibold text-[#111111] mt-0.5 block font-mono">
                    {selectedMachine.location}
                  </span>
                  <span className="text-[10px] text-[#787774] block uppercase font-mono">
                    Crit: {selectedMachine.criticality}
                  </span>
                </div>
              </div>

              {/* Operating Hours Progress Bar */}
              <div className="p-3 rounded bg-[#FBFBFA] border border-[#EAEAEA] space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] font-mono text-[#787774] uppercase font-semibold">
                    Operating Hours
                  </span>
                  <span className="font-bold text-[#111111] font-mono">
                    {selectedMachine.operating_hours.toLocaleString()} / 10,000 hrs
                  </span>
                </div>

                <div className="w-full h-2 rounded bg-[#EAEAEA] overflow-hidden">
                  <div
                    className={`h-full rounded transition-all duration-500 ${
                      isOverhaulNeeded
                        ? "bg-[#9F2F2D]"
                        : selectedMachine.operating_hours >= 8000
                        ? "bg-[#956400]"
                        : "bg-[#111111]"
                    }`}
                    style={{
                      width: `${Math.min(
                        Math.round((selectedMachine.operating_hours / 12000) * 100),
                        100
                      )}%`
                    }}
                  />
                </div>

                {isOverhaulNeeded && (
                  <p className="text-[11px] text-[#9F2F2D] font-mono flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    Major service interval exceeded by{" "}
                    {(selectedMachine.operating_hours - 10000).toLocaleString()} hrs
                  </p>
                )}
              </div>

              {/* Quick Actions */}
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() =>
                    handleSend(
                      `Check maintenance history and operating status for ${selectedMachine.machine_id} (${selectedMachine.name})`
                    )
                  }
                  className="w-full flex items-center justify-between p-2.5 rounded bg-[#111111] text-white hover:bg-[#262626] transition-all text-xs font-medium active:scale-[0.98]"
                >
                  <span className="flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5" />
                    Run Diagnostic Analysis
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Work Order Records Timeline */}
              <div className="pt-2 border-t border-[#EAEAEA]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#111111] font-mono">
                    Work Order History
                  </span>
                  <span className="text-[10px] font-mono text-[#787774]">
                    {machineLogs.length} Records
                  </span>
                </div>

                {loadingLogs ? (
                  <div className="p-3 text-center text-xs text-[#787774] font-mono">
                    Loading logs...
                  </div>
                ) : machineLogs.length === 0 ? (
                  <div className="p-3 text-center text-xs text-[#787774] font-mono bg-[#FBFBFA] rounded border border-[#EAEAEA]">
                    No historical logs recorded.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {machineLogs.slice(0, 5).map((log) => (
                      <div
                        key={log.id}
                        className="p-2.5 rounded bg-[#FBFBFA] border border-[#EAEAEA] text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-[#111111] font-mono">
                            {log.fault_code}
                          </span>
                          <span className="text-[10px] text-[#787774] font-mono">
                            {log.started_at}
                          </span>
                        </div>

                        <p className="text-[#2F3437] font-medium leading-snug">
                          {log.fault_description}
                        </p>

                        <div className="text-[10.5px] text-[#787774] bg-[#FFFFFF] p-1.5 rounded border border-[#EAEAEA]">
                          <span className="text-[#111111] font-medium">Action: </span>
                          {log.action_taken}
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-[#787774] font-mono pt-0.5">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {log.technician}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {log.duration_mins}m downtime
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
