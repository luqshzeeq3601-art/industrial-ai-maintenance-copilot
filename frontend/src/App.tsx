import { useState, useEffect, useRef } from "react";
import {
  BarChart3,
  Cpu,
  FileText,
  Hexagon,
  RotateCcw,
  Server,
  MessageSquare,
  Activity,
  ShieldCheck,
  Wrench,
  User
} from "lucide-react";
import type { EquipmentData } from "./components/visualization/OperatingHoursBarChart";
import { FleetRegisterPanel } from "./components/workspace/FleetRegisterPanel";
import { AssetHeader } from "./components/workspace/AssetHeader";
import { ConversationThread } from "./components/workspace/ConversationThread";
import { QueryBar } from "./components/workspace/QueryBar";
import { TelemetryInspectorPanel } from "./components/workspace/TelemetryInspectorPanel";
import { AuthModal, type AuthUser } from "./components/AuthModal";
import {
  DEFAULT_EQUIPMENT,
  DEFAULT_LOGS_EQ1000,
  DEFAULT_INITIAL_MESSAGES
} from "./components/workspace/defaults";
import type { Message, Stats, WorkOrderLog } from "./components/workspace/types";

const API_BASE =
  (import.meta as unknown as { env: Record<string, string | undefined> }).env?.VITE_API_URL ||
  "http://localhost:8000";

type MobileTab = "fleet" | "copilot" | "telemetry";

export default function App() {
  const [messages, setMessages] = useState<Message[]>(DEFAULT_INITIAL_MESSAGES);
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
  const [machineLogs, setMachineLogs] = useState<WorkOrderLog[]>(DEFAULT_LOGS_EQ1000);
  const [fleetSearch, setFleetSearch] = useState("");
  const [mobileTab, setMobileTab] = useState<MobileTab>("copilot");
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authOpen, setAuthOpen] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Sync auth state and stats from backend API
  useEffect(() => {
    fetch(`${API_BASE}/api/v1/auth/me`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.authenticated && data.user) {
          setCurrentUser({ ...data.user, csrf_token: data.csrf_token });
        }
      })
      .catch(() => {});

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

  // Sync machine history logs when selected machine changes
  useEffect(() => {
    if (!selectedMachineId) return;
    let ignore = false;

    fetch(`${API_BASE}/api/equipment/${selectedMachineId}/history`)
      .then((res) => res.json())
      .then((data) => {
        if (!ignore && data.logs && data.logs.length > 0) {
          setMachineLogs(data.logs);
        }
      })
      .catch(() => {});

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
        credentials: "include",
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
        abstain: data.abstain || false,
        pending_action: data.pending_action || null,
        action_result: data.action_result || null
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      const errorMsg: Message = {
        role: "assistant",
        content: `Communication error with backend API: ${message}. Please verify FastAPI is running on ${API_BASE}.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        abstain: true
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const resetSession = () => {
    setMessages(DEFAULT_INITIAL_MESSAGES);
  };

  const selectMachine = (machineId: string) => {
    setSelectedMachineId(machineId);
    setMobileTab("copilot");
  };

  const selectedMachine =
    equipmentList.find((e) => e.machine_id === selectedMachineId) || equipmentList[0];
  const faultCode = machineLogs[0]?.fault_code || "E-402";
  const faultSummary = (machineLogs[0]?.fault_description || "Spindle thermal overload").split(".")[0];

  const checkAlarm = () =>
    handleSend(
      `What does fault code ${faultCode} mean on ${selectedMachine.name} (${selectedMachine.machine_id}) and what is the corrective procedure?`
    );
  const openSop = () =>
    handleSend(
      `Give me the step-by-step SOP and LOTO safety rules for replacing spindle bearings on ${selectedMachine.name}`
    );
  const auditLogs = () =>
    handleSend(
      `Investigate recurring faults and maintenance history for ${selectedMachine.machine_id} (${selectedMachine.name})`
    );
  const runDiagnostic = () =>
    handleSend(
      `Check maintenance history and operating status for ${selectedMachine.machine_id} (${selectedMachine.name})`
    );


  return (
    <div className="flex flex-col h-[100dvh] min-h-[100dvh] w-full bg-[#F1F5F9] text-[#0F172A] antialiased overflow-hidden font-sans">
      {/* Top Operations Bar — Matching Dark Command Deck */}
      <header className="h-[52px] min-h-[52px] px-3 sm:px-4 lg:px-6 flex items-center justify-between gap-2 sm:gap-4 bg-[#111827] text-white shrink-0 shadow-sm z-20 overflow-hidden">
        {/* Brand Logo & Deck Title */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 shrink-0">
          <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
            <Hexagon className="w-[19px] h-[19px] text-white" strokeWidth={2.2} />
          </span>

          <div className="flex items-center gap-2">
            <h1 className="font-bold text-[15px] sm:text-[16px] tracking-tight whitespace-nowrap text-white">
              Maintenance Copilot
            </h1>
            <span className="hidden md:inline text-white/30 text-sm font-light">|</span>
            <span className="hidden md:inline text-[13px] text-slate-300 font-normal whitespace-nowrap">
              Command Deck
            </span>
          </div>
        </div>

        {/* Live System Telemetry Badges */}
        <div className="flex items-center gap-2 sm:gap-4 text-[12px] font-medium text-slate-300">
          {/* LangGraph Multi-Agent Indicator */}
          <span className="hidden sm:inline-flex items-center gap-1.5 whitespace-nowrap text-slate-200">
            <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse shrink-0" />
            <span>LangGraph Multi-Agent</span>
          </span>

          <span className="hidden md:inline-flex items-center gap-1.5 whitespace-nowrap font-mono text-slate-300">
            <Activity className="w-3.5 h-3.5 text-slate-400" />
            <span>Plant Uptime: 80%</span>
          </span>

          <span className="hidden md:block w-px h-3.5 bg-white/20" />

          <span className="hidden lg:inline-flex items-center gap-1.5 whitespace-nowrap font-mono text-slate-300">
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <span>560+ Work Orders</span>
          </span>

          <span className="hidden xl:block w-px h-3.5 bg-white/20" />

          <span className="hidden xl:inline-flex items-center gap-1.5 whitespace-nowrap font-mono text-slate-300">
            <Cpu className="w-3.5 h-3.5 text-slate-400" />
            <span>RTX 3070 / Qwen2.5 7B</span>
          </span>

          {/* User Profile / Action Buttons */}
          <div className="flex items-center gap-1.5 shrink-0 ml-1">
            <button
              type="button"
              onClick={() => setAuthOpen(true)}
              className={`min-h-[44px] px-3.5 py-2 rounded-lg text-[13px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                currentUser?.role === "supervisor" || currentUser?.role === "admin"
                  ? "bg-[#16A34A]/20 border border-[#22C55E]/40 text-[#4ADE80] hover:bg-[#16A34A]/30"
                  : currentUser
                  ? "bg-[#0284C7]/20 border border-[#38BDF8]/40 text-[#7DD3FC] hover:bg-[#0284C7]/30"
                  : "bg-white/10 hover:bg-white/20 text-slate-200"
              }`}
              title={
                currentUser
                  ? `Signed in as ${currentUser.full_name} (${currentUser.role})`
                  : "Click to sign in with plant credentials"
              }
            >
              {currentUser?.role === "supervisor" || currentUser?.role === "admin" ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-[#4ADE80]" />
                  <span>SUP · {currentUser.username}</span>
                </>
              ) : currentUser ? (
                <>
                  <Wrench className="w-3.5 h-3.5 text-[#38BDF8]" />
                  <span>TECH · {currentUser.username}</span>
                </>
              ) : (
                <>
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Sign In</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={resetSession}
              className="min-w-[44px] min-h-[44px] p-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer flex items-center justify-center"
              title="Reset diagnostic session"
              aria-label="Reset session"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile / Tablet Tab Switcher (Screens < 1024px) */}
      <div className="lg:hidden flex items-center justify-around bg-white border-b border-[#E2E8F0] px-2 py-2 shrink-0 text-[13px] font-semibold" role="tablist" aria-label="Workspace views">
        <button
          type="button"
          role="tab"
          aria-selected={mobileTab === "fleet"}
          onClick={() => setMobileTab("fleet")}
          className={`flex items-center gap-1.5 min-h-[44px] py-2 px-4 rounded-lg transition-colors ${
            mobileTab === "fleet" ? "bg-[#1E293B] text-white" : "text-[#64748B] hover:text-[#0F172A]"
          }`}
        >
          <Server className="w-4 h-4" />
          <span>Fleet ({equipmentList.length})</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={mobileTab === "copilot"}
          onClick={() => setMobileTab("copilot")}
          className={`flex items-center gap-1.5 min-h-[44px] py-2 px-4 rounded-lg transition-colors ${
            mobileTab === "copilot" ? "bg-[#1E293B] text-white" : "text-[#64748B] hover:text-[#0F172A]"
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Copilot</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={mobileTab === "telemetry"}
          onClick={() => setMobileTab("telemetry")}
          className={`flex items-center gap-1.5 min-h-[44px] py-2 px-4 rounded-lg transition-colors ${
            mobileTab === "telemetry" ? "bg-[#1E293B] text-white" : "text-[#64748B] hover:text-[#0F172A]"
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Telemetry</span>
        </button>
      </div>

      {/* Main Workspace: 3 Columns on Desktop (Full HD 1920x1080 Optimized) */}
      <main className="flex-1 min-h-0 p-3 lg:p-4 overflow-hidden">
        <div className="h-full w-full max-w-[1920px] mx-auto flex flex-col lg:grid lg:grid-cols-[280px_1fr_320px] xl:grid-cols-[300px_1fr_340px] 2xl:grid-cols-[320px_1fr_360px] gap-3 lg:gap-4">
          {/* Column 1: Fleet Register */}
          <div
            className={`h-full overflow-hidden ${
              mobileTab === "fleet" ? "flex flex-col flex-1" : "hidden lg:flex lg:flex-col"
            }`}
          >
            <FleetRegisterPanel
              equipment={equipmentList}
              selectedId={selectedMachineId}
              onSelect={selectMachine}
              searchFilter={fleetSearch}
              onSearchChange={setFleetSearch}
            />
          </div>

          {/* Column 2: Center Copilot Stage */}
          <div
            className={`h-full flex-col bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden ${
              mobileTab === "copilot" ? "flex flex-1" : "hidden lg:flex"
            }`}
          >
            {selectedMachine && (
              <AssetHeader
                machine={selectedMachine}
                faultCode={faultCode}
                faultSummary={faultSummary}
                onCheckAlarm={checkAlarm}
                onOpenSop={openSop}
                onAuditLogs={auditLogs}
              />
            )}

            <ConversationThread
              messages={messages}
              loading={loading}
              chatEndRef={chatEndRef}
              currentUser={currentUser}
              apiBase={API_BASE}
              onOpenAuth={() => setAuthOpen(true)}
            />

            <QueryBar
              input={input}
              onInputChange={setInput}
              loading={loading}
              onSend={handleSend}
            />
          </div>

          {/* Column 3: Telemetry Inspector & Work Order History */}
          <div
            className={`h-full overflow-hidden ${
              mobileTab === "telemetry" ? "flex flex-col flex-1" : "hidden lg:flex lg:flex-col"
            }`}
          >
            {selectedMachine && (
              <TelemetryInspectorPanel
                machine={selectedMachine}
                logs={machineLogs}
                onRunDiagnostic={runDiagnostic}
                onInspectOverdue={() => {
                  handleSend(
                    `What is the recommended maintenance procedure for ${selectedMachine.name} (${selectedMachine.machine_id}) to address overdue maintenance hours?`
                  );
                  if (mobileTab === "telemetry") setMobileTab("copilot");
                }}
                onSelectWorkOrder={(log) => {
                  handleSend(
                    `Investigate past maintenance work order #${log.id}: Fault ${log.fault_code} - "${log.action_taken}" on ${selectedMachine.name} by ${log.technician}. What recurring risks exist?`
                  );
                  if (mobileTab === "telemetry") setMobileTab("copilot");
                }}
              />
            )}
          </div>
        </div>
      </main>

      {/* Bottom Status Bar / Footer matching screenshot */}
      <footer className="h-8 min-h-[32px] px-5 flex items-center justify-between gap-4 text-[12px] text-[#475569] shrink-0 bg-[#F1F5F9] border-t border-[#E2E8F0] select-none">
        <div className="flex items-center gap-3 font-mono text-[12px] tabular-nums">
          <span>{stats ? stats.equipment_count : equipmentList.length} Plant Assets</span>
          <span className="text-[#94A3B8]" aria-hidden="true">|</span>
          <span>{stats ? stats.indexed_chunks : 142} RAG Chunks</span>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-[12px]">
          <span className="font-semibold text-[#334155]">Maintenance Copilot</span>
          <span className="text-[#94A3B8]" aria-hidden="true">|</span>
          <span>Production Intelligence for a More Reliable Tomorrow</span>
        </div>
      </footer>

      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        currentUser={currentUser}
        onLoginSuccess={(u) => setCurrentUser(u)}
        onLogoutSuccess={() => setCurrentUser(null)}
        apiBase={API_BASE}
      />
    </div>
  );
}
