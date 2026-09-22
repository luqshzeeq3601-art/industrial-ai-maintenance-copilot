import { useState, useEffect, useRef, useCallback } from "react";
import { AlertTriangle, BarChart3, CircleAlert, Factory, FileText, History, LayoutDashboard, MessageSquare, Server, ShieldCheck, Stethoscope } from "lucide-react";
import type { EquipmentData } from "./components/visualization/OperatingHoursBarChart";
import { AnalyticsDashboardView } from "./components/visualization/AnalyticsDashboardView";
import { FleetRegisterPanel } from "./components/workspace/FleetRegisterPanel";
import { AssetHeader, AssetTabBar } from "./components/workspace/AssetHeader";
import { DiagnosticsTab, FaultBanner, LogsTab, SopsTab } from "./components/workspace/AssetTabs";
import { ConversationThread } from "./components/workspace/ConversationThread";
import { QueryBar } from "./components/workspace/QueryBar";
import { ApprovalsQueueView } from "./components/workspace/ApprovalsQueueView";
import { TelemetryInspectorPanel } from "./components/workspace/TelemetryInspectorPanel";
import { UserMenu } from "./components/UserMenu";
import { SignInPage } from "./components/auth/SignInPage";
import { ProductMark } from "./components/auth/SignInArt";
import { isApproverRole, type AuthUser } from "./api/auth";
import { isOpenWorkOrder, type AssetTab, type Message, type TelemetryReading, type WorkOrderLog } from "./components/workspace/types";

const API_BASE =
  (import.meta as unknown as { env: Record<string, string | undefined> }).env?.VITE_API_URL ||
  "http://localhost:8000";

type MobileTab = "fleet" | "copilot" | "telemetry";
type View = "workspace" | "dashboard" | "approvals";
type LoadState = "loading" | "ready" | "error";

const NAV_ITEMS: { id: View; label: string; icon: typeof Server; approverOnly?: boolean }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "workspace", label: "Assets", icon: Factory },
  { id: "approvals", label: "Approvals", icon: ShieldCheck, approverOnly: true }
];

const timeNow = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [equipmentList, setEquipmentList] = useState<EquipmentData[]>([]);
  const [fleetState, setFleetState] = useState<LoadState>("loading");
  const [selectedMachineId, setSelectedMachineId] = useState<string | null>(null);
  const [machineLogs, setMachineLogs] = useState<WorkOrderLog[]>([]);
  const [logsState, setLogsState] = useState<LoadState>("loading");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [headerHidden, setHeaderHidden] = useState(false);
  const [telemetry, setTelemetry] = useState<{ machineId: string | null; readings: TelemetryReading[]; failed: boolean }>({
    machineId: null,
    readings: [],
    failed: false
  });
  const [fleetSearch, setFleetSearch] = useState("");
  const [mobileTab, setMobileTab] = useState<MobileTab>("copilot");
  const [view, setView] = useState<View>("workspace");
  const [activeTab, setActiveTab] = useState<AssetTab>("overview");
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [signInOpen, setSignInOpen] = useState(false);
  const [pendingApprovals, setPendingApprovals] = useState(0);

  const isApprover = isApproverRole(currentUser?.role);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const messageCountRef = useRef(messages.length);

  const fetchFleet = useCallback(() => {
    fetch(`${API_BASE}/api/equipment`, { signal: AbortSignal.timeout(15_000) })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: { equipment?: EquipmentData[] }) => {
        const list = data.equipment ?? [];
        setEquipmentList(list);
        // Open on the first asset in alarm, since that is where attention is needed
        setSelectedMachineId(
          (current) => current ?? (list.find((e) => e.status.toLowerCase() === "fault") ?? list[0])?.machine_id ?? null
        );
        setFleetState("ready");
      })
      .catch(() => setFleetState("error"));
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/api/v1/auth/me`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.authenticated && data.user) {
          setCurrentUser({ ...data.user, csrf_token: data.csrf_token });
        }
      })
      .catch(() => {});
    fetchFleet();
  }, [fetchFleet]);

  const retryFleet = () => {
    setFleetState("loading");
    fetchFleet();
  };

  // Approvers see how many requests wait for them; others never see the queue
  useEffect(() => {
    if (!isApprover) return;
    let ignore = false;
    const poll = () =>
      fetch(`${API_BASE}/api/v1/actions/pending`, { credentials: "include" })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!ignore && data) setPendingApprovals(data.count ?? 0);
        })
        .catch(() => {});
    poll();
    const timer = window.setInterval(poll, 60_000);
    return () => {
      ignore = true;
      window.clearInterval(timer);
    };
  }, [isApprover]);

  // Work order history for the selected asset
  useEffect(() => {
    if (!selectedMachineId) return;
    let ignore = false;

    fetch(`${API_BASE}/api/equipment/${encodeURIComponent(selectedMachineId)}/history`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (ignore) return;
        setMachineLogs(Array.isArray(data.logs) ? data.logs : []);
        setLogsState("ready");
      })
      .catch(() => {
        if (ignore) return;
        setMachineLogs([]);
        setLogsState("error");
      });

    return () => {
      ignore = true;
    };
  }, [selectedMachineId]);

  // Latest reading per metric for the selected asset
  useEffect(() => {
    if (!selectedMachineId) return;
    let ignore = false;

    fetch(`${API_BASE}/api/v1/telemetry/events?machine_id=${encodeURIComponent(selectedMachineId)}&limit=50`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: { events?: Array<Record<string, unknown>> }) => {
        if (ignore) return;
        const latest = new Map<string, TelemetryReading>();
        for (const e of data.events ?? []) {
          const metric = String(e.metric ?? e.event_type ?? "");
          const value = typeof e.value === "number" ? e.value : Number(e.value);
          if (!metric || !Number.isFinite(value) || latest.has(metric)) continue;
          latest.set(metric, {
            metric,
            value,
            unit: typeof e.unit === "string" ? e.unit : "",
            severity: typeof e.severity === "string" ? e.severity : null,
            timestamp: typeof e.timestamp === "string" ? e.timestamp : null
          });
        }
        setTelemetry({ machineId: selectedMachineId, readings: [...latest.values()], failed: false });
      })
      .catch(() => {
        if (!ignore) setTelemetry({ machineId: selectedMachineId, readings: [], failed: true });
      });

    return () => {
      ignore = true;
    };
  }, [selectedMachineId]);

  // Follow new conversation content; not on first paint or asset-switch dividers
  useEffect(() => {
    const grew = messages.length > messageCountRef.current;
    messageCountRef.current = messages.length;
    const last = messages[messages.length - 1];
    if ((grew && last?.role !== "context") || loading) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages, loading]);

  // New asset: start at its header
  useEffect(() => {
    stageRef.current?.scrollTo({ top: 0 });
  }, [selectedMachineId]);

  const selectedMachine = equipmentList.find((e) => e.machine_id === selectedMachineId) ?? null;
  const hasMachine = selectedMachine !== null;

  // Pin a compact asset identity into the tab bar once the header scrolls away
  useEffect(() => {
    const root = stageRef.current;
    const el = headerRef.current;
    if (!root || !el) return;
    const io = new IntersectionObserver(([entry]) => setHeaderHidden(!entry.isIntersecting), { root });
    io.observe(el);
    return () => io.disconnect();
  }, [view, hasMachine]);

  /** withAssetContext: free-text questions from the query bar are scoped to the selected asset. */
  const handleSend = async (query: string, withAssetContext = false) => {
    if (!query.trim() || loading) return;

    let apiMessage = query;
    if (withAssetContext && selectedMachine) {
      const { machine_id, name, type, location, status } = selectedMachine;
      const mentioned =
        query.toUpperCase().includes(machine_id.toUpperCase()) || query.toLowerCase().includes(name.toLowerCase());
      const scoped = `${query}\n\n[Selected asset: ${machine_id} ${name}, ${type}, ${location}, status ${status}]`;
      if (!mentioned && scoped.length <= 2000) apiMessage = scoped;
    }

    // Answers render in the Overview conversation
    setView("workspace");
    setActiveTab("overview");
    setMobileTab("copilot");

    setMessages((prev) => [...prev, { role: "user", content: query, timestamp: timeNow() }]);
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: apiMessage, session_id: sessionId ?? undefined })
      });

      if (!response.ok) {
        throw new Error(`status ${response.status}`);
      }

      const data = await response.json();
      if (typeof data.session_id === "string") setSessionId(data.session_id);
      const botMsg: Message = {
        role: "assistant",
        content: data.answer,
        timestamp: timeNow(),
        workflow_trace: data.workflow_trace || [],
        citations: data.citations || [],
        abstain: data.abstain || false,
        pending_action: data.pending_action || null,
        action_result: data.action_result || null
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: unknown) {
      const detail = err instanceof Error && err.message.startsWith("status") ? ` (${err.message})` : "";
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `The copilot didn't respond${detail}. Check your connection and ask again.`,
          timestamp: timeNow(),
          error: true
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const resetSession = () => {
    setMessages([]);
    setSessionId(null);
  };

  const selectMachine = (machineId: string) => {
    if (machineId !== selectedMachineId) {
      const next = equipmentList.find((e) => e.machine_id === machineId);
      const marker: Message = {
        role: "context",
        content: `Now viewing ${machineId}${next ? ` ${next.name}` : ""}`,
        timestamp: timeNow()
      };
      // A divider only matters inside an ongoing conversation; consecutive switches replace it
      setMessages((prev) =>
        !prev.some((m) => m.role === "user")
          ? prev
          : prev[prev.length - 1]?.role === "context"
          ? [...prev.slice(0, -1), marker]
          : [...prev, marker]
      );
      setMachineLogs([]);
      setLogsState("loading");
    }
    setSelectedMachineId(machineId);
    setView("workspace");
    setMobileTab("copilot");
  };

  const openLogs = () => {
    setActiveTab("logs");
    setMobileTab("copilot");
  };

  // The alarm is the most recent open work order; closed history never reads as an active fault
  const openLog = machineLogs.find(isOpenWorkOrder) ?? null;
  const faultCode = openLog?.fault_code ?? null;
  const countStatus = (status: string) => equipmentList.filter((e) => e.status.toLowerCase() === status).length;
  const runningCount = countStatus("operational");
  const faultCount = countStatus("fault");
  const maintenanceCount = countStatus("maintenance");
  const faultSummary = openLog?.fault_description?.split(".")[0] || "Active fault";

  const machine = selectedMachine;
  const checkAlarm = () =>
    machine &&
    handleSend(
      `What does ${faultCode ? `fault code ${faultCode}` : "the active fault"} mean on ${machine.name} (${machine.machine_id}) and what is the corrective procedure?`
    );
  const openSop = () =>
    machine &&
    handleSend(
      `Give me the step-by-step SOP and LOTO safety rules for ${faultCode ? `fault ${faultCode}` : "servicing"} on ${machine.name} (${machine.machine_id}, ${machine.type})`
    );
  const auditLogs = () =>
    machine && handleSend(`Investigate recurring faults and maintenance history for ${machine.machine_id} (${machine.name})`);
  const runDiagnostic = () =>
    machine && handleSend(`Check maintenance history and operating status for ${machine.machine_id} (${machine.name})`);
  const inspectOverdue = () =>
    machine &&
    handleSend(
      `What is the recommended maintenance procedure for ${machine.name} (${machine.machine_id}) to address overdue maintenance hours?`
    );

  const navItems = NAV_ITEMS.filter((item) => !item.approverOnly || isApprover);
  const mobileItems: { id: string; label: string; icon: typeof Server; badge?: number; selected: boolean; onClick: () => void }[] = [
    ...(["fleet", "copilot", "telemetry"] as const).map((id) => ({
      id,
      label: id === "fleet" ? "Fleet" : id === "copilot" ? "Asset" : "Telemetry",
      icon: id === "fleet" ? Server : id === "copilot" ? MessageSquare : BarChart3,
      selected: view === "workspace" && mobileTab === id,
      onClick: () => {
        setView("workspace");
        setMobileTab(id);
      }
    })),
    ...navItems
      .filter((item) => item.id !== "workspace")
      .map((item) => ({
        id: item.id,
        label: item.label,
        icon: item.icon,
        badge: item.id === "approvals" ? pendingApprovals : 0,
        selected: view === item.id,
        onClick: () => setView(item.id)
      }))
  ];

  const panelClass = "bg-panel rounded-xl border border-line shadow-[var(--shadow-tinted-xs)]";

  return (
    <div className="relative flex h-[100dvh] min-h-[100dvh] w-full bg-paper text-ink antialiased overflow-clip font-sans">
      <a href="#workspace" className="skip-link">
        Skip to workspace
      </a>

      {/* Main navigation: icons at lg, labels at xl */}
      <aside aria-label="Primary" className="hidden lg:flex flex-col w-[68px] xl:w-[200px] shrink-0 bg-sunken border-r border-line">
        <div className="h-[60px] shrink-0 flex items-center gap-2.5 px-4 justify-center xl:justify-start border-b border-line">
          <ProductMark className="w-7 h-7 shrink-0" />
          <span className="hidden xl:block text-[15px] font-semibold text-ink tracking-tight whitespace-nowrap">
            Maintenance Copilot
          </span>
        </div>

        <nav className="flex-1 px-2.5 pt-3">
          <ul className="space-y-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = view === item.id;
              const badge = item.id === "approvals" ? pendingApprovals : 0;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setView(item.id)}
                    aria-current={active ? "page" : undefined}
                    title={badge ? `${item.label} (${badge} waiting)` : item.label}
                    className={`relative w-full flex items-center gap-3 min-h-[40px] pointer-coarse:min-h-[44px] px-3 rounded-md text-[14px] transition-colors cursor-pointer justify-center xl:justify-start ${
                      active
                        ? "bg-panel text-accent-ink font-semibold shadow-[var(--shadow-tinted-xs)] ring-1 ring-line before:absolute before:left-0 before:inset-y-2 before:w-[3px] before:rounded-r before:bg-accent"
                        : "text-body font-medium hover:bg-wash hover:text-ink"
                    }`}
                  >
                    <Icon className={`w-[18px] h-[18px] shrink-0 ${active ? "text-accent" : "text-subtle"}`} strokeWidth={1.75} aria-hidden="true" />
                    <span className="sr-only xl:not-sr-only truncate">{item.label}</span>
                    {badge > 0 && (
                      <span className="absolute top-1 right-1 xl:static xl:ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-warn text-white text-[11px] font-semibold tabular-nums flex items-center justify-center">
                        {badge}
                        <span className="sr-only"> waiting</span>
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-[60px] shrink-0 flex items-center gap-3 px-3 sm:px-4 lg:px-5 bg-panel border-b border-line">
          <ProductMark className="lg:hidden w-7 h-7 shrink-0" />
          <span className="lg:hidden text-[15px] font-semibold text-ink tracking-tight truncate">Maintenance Copilot</span>

          {fleetState === "ready" && (
            <dl
              className="hidden md:flex items-center h-9 rounded-lg border border-line bg-sunken text-[13px] divide-x divide-line"
              aria-label="Plant status"
            >
              {[
                { label: "Running", value: `${runningCount}/${equipmentList.length}`, dot: "bg-status-ok", tone: "text-ink" },
                { label: "Faults", value: faultCount, dot: faultCount ? "bg-status-fault" : "bg-faint", tone: faultCount ? "text-danger" : "text-ink" },
                { label: "Maintenance", value: maintenanceCount, dot: maintenanceCount ? "bg-status-maint" : "bg-faint", tone: "text-ink" }
              ].map(({ label, value, dot, tone }) => (
                <div key={label} className="flex items-center gap-2 px-3">
                  <span className={`w-2 h-2 rounded-full ${dot}`} aria-hidden="true" />
                  <dt className="text-muted">{label}</dt>
                  <dd className={`font-semibold tabular-nums ${tone}`}>{value}</dd>
                </div>
              ))}
            </dl>
          )}

          <div className="ml-auto shrink-0">
            <UserMenu
              apiBase={API_BASE}
              currentUser={currentUser}
              onSignIn={() => setSignInOpen(true)}
              onSignedOut={() => {
                setCurrentUser(null);
                setPendingApprovals(0);
                setView((v) => (v === "approvals" ? "workspace" : v));
              }}
            />
          </div>
        </header>

        {/* Navigation below 1024px */}
        <nav aria-label="Workspace views" className="lg:hidden bg-panel border-b border-line px-2 sm:px-3 py-1.5 shrink-0 font-semibold">
          <ul className="flex gap-1">
            {mobileItems.map(({ id, label, icon: Icon, badge, selected, onClick }) => (
              <li key={id} className="flex-1 min-w-0">
                <button
                  type="button"
                  aria-current={selected ? "page" : undefined}
                  onClick={onClick}
                  className={`w-full flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 min-h-[48px] sm:min-h-[44px] px-1 rounded-md text-[11px] sm:text-[13px] transition-colors cursor-pointer ${
                    selected ? "bg-accent-bg text-accent-ink" : "text-muted hover:text-ink hover:bg-wash"
                  }`}
                >
                  <span className="relative">
                    <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                    {badge ? (
                      <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-warn text-white text-[10px] leading-4 text-center tabular-nums">
                        {badge}
                      </span>
                    ) : null}
                  </span>
                  <span className="max-w-full truncate">
                    {label}
                    {badge ? <span className="sr-only">, {badge} waiting</span> : null}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <main id="workspace" tabIndex={-1} className="flex-1 min-h-0 p-3 lg:p-4 overflow-clip focus:outline-none">
          {view === "approvals" && currentUser && isApprover ? (
            <ApprovalsQueueView apiBase={API_BASE} currentUser={currentUser} onCountChange={setPendingApprovals} />
          ) : view === "dashboard" ? (
            <div className="h-full overflow-y-auto custom-scrollbar">
              <AnalyticsDashboardView
                apiBase={API_BASE}
                equipmentList={equipmentList}
                selectedMachineId={selectedMachineId ?? undefined}
                onSelectMachine={selectMachine}
              />
            </div>
          ) : fleetState !== "ready" || !selectedMachine ? (
            <div className={`${panelClass} h-full flex items-center justify-center p-6`}>
              {fleetState === "loading" ? (
                <p className="text-[14px] text-muted" role="status">
                  Loading the fleet…
                </p>
              ) : fleetState === "error" ? (
                <div role="alert" className="max-w-[44ch] text-center">
                  <CircleAlert className="w-6 h-6 mx-auto text-danger" aria-hidden="true" />
                  <p className="mt-2 text-[15px] font-semibold text-ink">The fleet didn't load</p>
                  <p className="mt-1 text-[14px] text-muted">The maintenance service isn't responding. Check that it is running, then try again.</p>
                  <button
                    type="button"
                    onClick={retryFleet}
                    className="mt-4 min-h-[40px] px-4 rounded-md border border-line-strong bg-panel text-[14px] font-semibold text-ink hover:bg-sunken cursor-pointer"
                  >
                    Try again
                  </button>
                </div>
              ) : (
                <p className="text-[14px] text-muted" role="status">
                  No assets are registered yet.
                </p>
              )}
            </div>
          ) : (
            <div className="h-full w-full max-w-[1920px] mx-auto flex flex-col lg:grid lg:grid-cols-[232px_minmax(0,1fr)_264px] xl:grid-cols-[284px_minmax(0,1fr)_320px] 2xl:grid-cols-[304px_minmax(0,1fr)_360px] gap-3 lg:gap-4">
              <div className={`h-full min-h-0 overflow-hidden ${mobileTab === "fleet" ? "flex flex-col flex-1" : "hidden lg:flex lg:flex-col"}`}>
                <FleetRegisterPanel
                  equipment={equipmentList}
                  selectedId={selectedMachine.machine_id}
                  onSelect={selectMachine}
                  searchFilter={fleetSearch}
                  onSearchChange={setFleetSearch}
                />
              </div>

              <section
                aria-label="Asset workspace"
                className={`@container ${panelClass} h-full min-h-0 flex-col overflow-hidden ${mobileTab === "copilot" ? "flex flex-1" : "hidden lg:flex"}`}
              >
                {/* One scroll region: the header scrolls away, tabs stay pinned, query bar stays below */}
                <div ref={stageRef} className="relative flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                  <div ref={headerRef}>
                    <AssetHeader machine={selectedMachine} onInspectOverdue={inspectOverdue} />
                  </div>
                  <AssetTabBar machine={selectedMachine} activeTab={activeTab} onTabChange={setActiveTab} compact={headerHidden} />

                  <div id="asset-tabpanel" role="tabpanel" aria-labelledby={`asset-tab-${activeTab}`}>
                    {activeTab === "overview" ? (
                      <ConversationThread
                        messages={messages}
                        loading={loading}
                        chatEndRef={chatEndRef}
                        currentUser={currentUser}
                        apiBase={API_BASE}
                        onOpenAuth={() => setSignInOpen(true)}
                        onNewConversation={resetSession}
                        assetName={selectedMachine.name}
                        suggestions={[
                          ...(faultCode ? [{ label: `Explain ${faultCode}`, icon: AlertTriangle, onClick: checkAlarm }] : []),
                          { label: "Status check", icon: Stethoscope, onClick: runDiagnostic },
                          { label: "Safety SOP", icon: FileText, onClick: openSop },
                          { label: "Recurring faults", icon: History, onClick: auditLogs }
                        ]}
                        lead={
                          selectedMachine.status.toLowerCase() === "fault" ? (
                            <FaultBanner machine={selectedMachine} faultCode={faultCode} faultSummary={faultSummary} onCheckAlarm={checkAlarm} />
                          ) : undefined
                        }
                      />
                    ) : (
                      <div className="px-4 @min-[560px]:px-6 py-5">
                        {activeTab === "diagnostics" && (
                          <DiagnosticsTab
                            machine={selectedMachine}
                            faultCode={faultCode}
                            messages={messages}
                            loading={loading}
                            onCheckAlarm={checkAlarm}
                            onRunDiagnostic={runDiagnostic}
                            onInspectOverdue={inspectOverdue}
                          />
                        )}
                        {activeTab === "sops" && (
                          <SopsTab machine={selectedMachine} messages={messages} loading={loading} onOpenSop={openSop} />
                        )}
                        {activeTab === "logs" && (
                          <LogsTab logs={machineLogs} logsState={logsState} loading={loading} onAuditLogs={auditLogs} />
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <QueryBar
                  input={input}
                  onInputChange={setInput}
                  loading={loading}
                  onSend={(text) => handleSend(text, true)}
                  assetName={selectedMachine.name}
                />
              </section>

              <div className={`h-full min-h-0 overflow-hidden ${mobileTab === "telemetry" ? "flex flex-col flex-1" : "hidden lg:flex lg:flex-col"}`}>
                <TelemetryInspectorPanel
                  machine={selectedMachine}
                  logs={machineLogs}
                  logsState={logsState}
                  readings={telemetry.readings}
                  telemetryLoading={telemetry.machineId !== selectedMachine.machine_id}
                  telemetryFailed={telemetry.failed}
                  faultCode={faultCode}
                  busy={loading}
                  onRunDiagnostic={runDiagnostic}
                  onViewSop={openSop}
                  onViewAllWorkOrders={openLogs}
                  onSelectWorkOrder={(log) =>
                    handleSend(
                      `Investigate past maintenance work order #${log.id}: Fault ${log.fault_code} - "${log.action_taken}" on ${selectedMachine.name} by ${log.technician}. What recurring risks exist?`
                    )
                  }
                />
              </div>
            </div>
          )}
        </main>
      </div>

      {signInOpen && !currentUser && (
        <SignInPage apiBase={API_BASE} onLoginSuccess={(u) => setCurrentUser(u)} onClose={() => setSignInOpen(false)} />
      )}
    </div>
  );
}
