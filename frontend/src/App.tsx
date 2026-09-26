import { useEffect, useRef, useState } from "react";
import {
  Activity,
  BarChart3,
  BookOpen,
  CircleAlert,
  CircleHelp,
  ClipboardList,
  Factory,
  History,
  LayoutDashboard,
  Menu,
  MessageSquare,
  RotateCw,
  Search,
  Server,
  Settings,
  ShieldCheck
} from "lucide-react";
import { AnalyticsDashboardView } from "./components/visualization/AnalyticsDashboardView";
import { FleetRegisterPanel } from "./components/workspace/FleetRegisterPanel";
import { AssetHeader, AssetTabBar } from "./components/workspace/AssetHeader";
import { DiagnosticsTab, FaultBanner, LogsTab, SopsTab } from "./components/workspace/AssetTabs";
import { ConversationThread } from "./components/workspace/ConversationThread";
import { QueryBar } from "./components/workspace/QueryBar";
import { ApprovalsQueueView } from "./components/workspace/ApprovalsQueueView";
import { TelemetryInspectorPanel } from "./components/workspace/TelemetryInspectorPanel";
import { DocumentViewer } from "./components/workspace/DocumentViewer";
import { UserMenu } from "./components/UserMenu";
import { SignInPage } from "./components/auth/SignInPage";
import { ProductMark } from "./components/auth/SignInArt";
import { PrimarySidebar, type NavItem } from "./components/shell/PrimarySidebar";
import { HelpDialog } from "./components/shell/HelpDialog";
import { DemoDataBanner } from "./components/shell/DemoDataBanner";
import { isOpenWorkOrder, type AssetTab, type Citation } from "./components/workspace/types";
import { API_BASE } from "./config";
import { pickDefaultAsset, useFleet } from "./hooks/useFleet";
import { useWorkOrders } from "./hooks/useWorkOrders";
import { useTelemetry } from "./hooks/useTelemetry";
import { useChat } from "./hooks/useChat";
import { useSession } from "./hooks/useSession";
import { useTheme } from "./hooks/useTheme";

// Spec View Components
import { AssetsView } from "./components/views/AssetsView";
import { AssetDetailView } from "./components/views/AssetDetailView";
import { DiagnosticsView } from "./components/views/DiagnosticsView";
import { SopsView } from "./components/views/SopsView";
import { WorkOrdersView } from "./components/views/WorkOrdersView";
import { HistoryView } from "./components/views/HistoryView";
import { SettingsView } from "./components/views/SettingsView";

type MobileTab = "fleet" | "copilot" | "telemetry";
export type View =
  | "workspace"
  | "dashboard"
  | "assets"
  | "asset-detail"
  | "diagnostics"
  | "sops"
  | "work-orders"
  | "history"
  | "settings"
  | "approvals";

const ASSET_TABS: AssetTab[] = ["overview", "diagnostics", "sops", "logs"];
const VIEWS: View[] = [
  "workspace",
  "dashboard",
  "assets",
  "asset-detail",
  "diagnostics",
  "sops",
  "work-orders",
  "history",
  "settings",
  "approvals"
];

function readUrlParams(): { asset: string | null; tab: AssetTab | null; view: View | null } {
  try {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab") as AssetTab | null;
    const view = params.get("view") as View | null;
    return {
      asset: params.get("asset")?.trim() || null,
      tab: tab && ASSET_TABS.includes(tab) ? tab : null,
      view: view && VIEWS.includes(view) ? view : null
    };
  } catch {
    return { asset: null, tab: null, view: null };
  }
}

const INITIAL_URL = readUrlParams();

export default function App() {
  const fleet = useFleet();
  const session = useSession();
  const chat = useChat();
  useTheme();

  const [requestedAssetId, setRequestedAssetId] = useState<string | null>(INITIAL_URL.asset);
  const [view, setView] = useState<View>(INITIAL_URL.view ?? "workspace");
  const [activeTab, setActiveTab] = useState<AssetTab>(INITIAL_URL.tab ?? "overview");
  const [mobileTab, setMobileTab] = useState<MobileTab>("copilot");
  const [input, setInput] = useState("");
  const [fleetSearch, setFleetSearch] = useState("");
  const [globalSearch, setGlobalSearch] = useState("");
  const [fleetStatusFilter, setFleetStatusFilter] = useState<string | null>(null);
  const [headerHidden, setHeaderHidden] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [openDocument, setOpenDocument] = useState<Citation | null>(null);

  const selectedMachineId = fleet.state === "ready" ? pickDefaultAsset(fleet.equipment, requestedAssetId) : null;
  const selectedMachine = fleet.equipment.find((e) => e.machine_id === selectedMachineId) ?? null;
  const workOrders = useWorkOrders(selectedMachineId);
  const telemetry = useTelemetry(selectedMachineId);

  const showSignIn = (signInOpen || session.expired) && !session.currentUser;
  const isDemo = fleet.source === "demo";

  const chatEndRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const mobileDialogRef = useRef<HTMLDialogElement>(null);
  const messageCountRef = useRef(chat.messages.length);

  // Follow new conversation content; not on first paint or asset-switch dividers
  useEffect(() => {
    const grew = chat.messages.length > messageCountRef.current;
    messageCountRef.current = chat.messages.length;
    const last = chat.messages[chat.messages.length - 1];
    if ((grew && last?.role !== "context") || chat.loading) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [chat.messages, chat.loading]);

  // New asset: start at its header
  useEffect(() => {
    stageRef.current?.scrollTo({ top: 0 });
  }, [selectedMachineId]);

  // Pin a compact asset identity into the tab bar once the header scrolls away
  const hasMachine = selectedMachine !== null;
  useEffect(() => {
    const root = stageRef.current;
    const el = headerRef.current;
    if (!root || !el) return;
    const io = new IntersectionObserver(([entry]) => setHeaderHidden(!entry.isIntersecting), { root });
    io.observe(el);
    return () => io.disconnect();
  }, [view, hasMachine]);

  // Keep the URL shareable: view, asset, and tab
  useEffect(() => {
    try {
      const params = new URLSearchParams();
      if (view !== "workspace") {
        params.set("view", view);
      } else {
        if (selectedMachineId) params.set("asset", selectedMachineId);
        if (activeTab !== "overview") params.set("tab", activeTab);
      }
      const query = params.toString();
      window.history.replaceState(null, "", query ? `${window.location.pathname}?${query}` : window.location.pathname);
    } catch {
      // Ignore in restricted environments
    }
  }, [view, selectedMachineId, activeTab]);

  // Approvers only; a signed-out or demoted user falls back to the workspace
  const effectiveView: View = view === "approvals" && !session.isApprover ? "assets" : view;

  /** Scoped questions from the query bar carry the selected asset so the copilot knows what "this" means. */
  const ask = (query: string, withAssetContext = false) => {
    if (!query.trim() || chat.loading) return;
    let apiMessage = query;
    if (withAssetContext && selectedMachine) {
      const { machine_id, name, type, location, status } = selectedMachine;
      const mentioned = query.toUpperCase().includes(machine_id.toUpperCase()) || query.toLowerCase().includes(name.toLowerCase());
      const scoped = `${query}\n\n[Selected asset: ${machine_id} ${name}, ${type}, ${location}, status ${status}]`;
      if (!mentioned && scoped.length <= 2000) apiMessage = scoped;
    }
    setView("workspace");
    setActiveTab("overview");
    setMobileTab("copilot");
    void chat.send(query, apiMessage);
  };

  const selectMachine = (machineId: string) => {
    if (machineId !== selectedMachineId) {
      const next = fleet.equipment.find((e) => e.machine_id === machineId);
      chat.markContext(`Now viewing ${machineId}${next ? ` ${next.name}` : ""}`);
    }
    setRequestedAssetId(machineId);
    setMobileTab("copilot");
  };

  // The alarm is the most recent open work order; closed history never reads as an active fault
  const openLog = workOrders.logs.find(isOpenWorkOrder) ?? null;
  const faultCode = openLog?.fault_code ?? null;
  const countStatus = (status: string) => fleet.equipment.filter((e) => e.status.toLowerCase() === status).length;
  const citedSopCount = new Set(
    chat.messages.flatMap((m) => (m.citations ?? []).map((c) => `${c.document || c.source}-${c.page ?? ""}`))
  ).size;

  const machine = selectedMachine;
  const searchMatches = globalSearch.trim()
    ? fleet.equipment.filter((item) =>
        (item.name + " " + item.machine_id + " " + item.location).toLowerCase().includes(globalSearch.trim().toLowerCase())
      ).slice(0, 5)
    : [];
  const checkAlarm = () =>
    machine &&
    ask(`What does ${faultCode ? `fault code ${faultCode}` : "the active fault"} mean on ${machine.name} (${machine.machine_id}) and what is the corrective procedure?`);
  const openSop = () =>
    machine &&
    ask(`Give me the step-by-step SOP and LOTO safety rules for ${faultCode ? `fault ${faultCode}` : "servicing"} on ${machine.name} (${machine.machine_id}, ${machine.type})`);
  const auditLogs = () => machine && ask(`Investigate recurring faults and maintenance history for ${machine.machine_id} (${machine.name})`);
  const runDiagnostic = (id?: string) => {
    const target = fleet.equipment.find((item) => item.machine_id === id) ?? machine;
    if (target) ask(`Check maintenance history and operating status for ${target.machine_id} (${target.name})`);
  };
  const inspectOverdue = () =>
    machine && ask(`What is the recommended maintenance procedure for ${machine.name} (${machine.machine_id}) to address overdue maintenance hours?`);

  const navItems: NavItem<View>[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "assets", label: "Assets", icon: Factory },
    { id: "diagnostics", label: "Diagnostics", icon: Activity },
    { id: "sops", label: "SOPs", icon: BookOpen },
    { id: "work-orders", label: "Work Orders", icon: ClipboardList },
    { id: "history", label: "History", icon: History },
    { id: "settings", label: "Settings", icon: Settings },
    ...(session.isApprover ? [{ id: "approvals" as const, label: "Approvals", icon: ShieldCheck, badge: session.pendingApprovals }] : [])
  ];

  const mobileItems = (["fleet", "copilot", "telemetry"] as const).map((id) => ({
      id,
      label: id === "fleet" ? "Fleet" : id === "copilot" ? "Asset" : "Telemetry",
      icon: id === "fleet" ? Server : id === "copilot" ? MessageSquare : BarChart3,
      badge: id === "fleet" ? countStatus("fault") : 0,
      badgeLabel: "in fault",
      badgeTone: "bg-danger-solid",
      selected: effectiveView === "workspace" && mobileTab === id,
      onClick: () => {
        setView("workspace");
        setMobileTab(id);
      }
    }));

  const panelClass = "bg-panel rounded-lg border border-line-strong/70 shadow-[var(--shadow-cockpit)]";

  return (
    <>
      <div inert={showSignIn} className="relative flex h-[100dvh] min-h-[100dvh] w-full bg-paper text-ink antialiased overflow-clip font-sans">
        <a href="#workspace" className="skip-link">
          Skip to workspace
        </a>

        <PrimarySidebar
          items={navItems}
          active={effectiveView === "asset-detail" ? "assets" : effectiveView}
          onNavigate={setView}
          onOpenHelp={() => setHelpOpen(true)}
        />

        <div className="flex-1 min-w-0 flex flex-col">
          <header className="h-[60px] shrink-0 flex items-center gap-3 px-3 sm:px-4 lg:px-5 bg-panel border-b border-line">
            <ProductMark className="lg:hidden w-7 h-7 shrink-0 text-blue-600" />
            <span className="lg:hidden text-copy font-semibold text-ink tracking-tight truncate">Maintenance Copilot</span>

            <form
              className="relative ml-auto hidden w-full max-w-[430px] sm:block"
              onSubmit={(event) => {
                event.preventDefault();
                if (searchMatches[0]) {
                  selectMachine(searchMatches[0].machine_id);
                  setView("asset-detail");
                  setGlobalSearch("");
                }
              }}
            >
              <label className="sr-only" htmlFor="global-asset-search">Search assets</label>
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-subtle" aria-hidden="true" />
              <input
                id="global-asset-search"
                type="search"
                autoComplete="off"
                value={globalSearch}
                onChange={(event) => setGlobalSearch(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Escape") setGlobalSearch(""); }}
                placeholder="Search assets..."
                className="h-10 w-full rounded-lg border border-line-strong bg-panel pl-9 pr-3 text-small text-ink placeholder:text-subtle focus:outline-2 focus:outline-accent"
              />
              {globalSearch.trim() && (
                <div className="absolute left-0 right-0 top-full z-[var(--z-pop)] mt-1 rounded-lg border border-line bg-panel p-1 shadow-[var(--shadow-tinted-md)]">
                  {searchMatches.length ? searchMatches.map((item) => (
                    <button key={item.machine_id} type="button" className="flex min-h-11 w-full items-center justify-between rounded-md px-3 text-left text-small hover:bg-sunken"
                      onClick={() => { selectMachine(item.machine_id); setView("asset-detail"); setGlobalSearch(""); }}>
                      <span className="font-medium text-ink">{item.name}</span><span className="font-data text-meta text-muted">{item.machine_id}</span>
                    </button>
                  )) : <p className="p-3 text-small text-muted">No matching assets</p>}
                </div>
              )}
            </form>

            <div className="hidden xl:flex items-center gap-1.5 border-l border-line pl-3">
              {[
                { status: "operational", label: "Running", count: countStatus("operational"), tone: "text-success border-success-line/60 bg-success-bg/40", activeTone: "bg-success-solid text-white border-transparent" },
                { status: "fault", label: "Faults", count: countStatus("fault"), tone: "text-danger border-danger-line/60 bg-danger-bg/40", activeTone: "bg-danger-solid text-white border-transparent" },
                { status: "maintenance", label: "Maintenance", count: countStatus("maintenance"), tone: "text-warn border-warn-line/60 bg-warn-bg/40", activeTone: "bg-warn-solid text-white border-transparent" }
              ].map(({ status, label, count, tone, activeTone }) => {
                const active = fleetStatusFilter === status;
                return (
                  <button
                    key={status}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setFleetStatusFilter(active ? null : status)}
                    className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-meta font-medium border transition-colors cursor-pointer ${
                      active ? activeTone : `${tone} hover:opacity-80`
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-white" : status === "operational" ? "bg-status-ok" : status === "fault" ? "bg-status-fault" : "bg-status-maint"}`} />
                    <span>{label}</span>
                    <span className="font-mono tabular-nums font-semibold">{count}</span>
                  </button>
                );
              })}
            </div>

            <div className="ml-auto shrink-0 flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1.5 text-label text-muted">
                <button
                  type="button"
                  onClick={() => fleet.reload()}
                  aria-label="Refresh data"
                  title="Refresh data"
                  className="grid h-10 w-10 place-items-center rounded-md hover:bg-wash text-muted hover:text-ink transition-colors cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => setHelpOpen(true)}
                aria-label="Help and shortcuts"
                className="lg:hidden w-10 h-10 pointer-coarse:w-11 pointer-coarse:h-11 rounded-md flex items-center justify-center text-muted hover:text-ink hover:bg-wash cursor-pointer"
              >
                <CircleHelp className="w-[18px] h-[18px]" strokeWidth={1.75} aria-hidden="true" />
              </button>
              <UserMenu
                apiBase={API_BASE}
                currentUser={session.currentUser}
                onSignIn={() => setSignInOpen(true)}
                onSignedOut={session.signedOut}
                onSwitchAccount={() => {
                  session.signedOut();
                  setSignInOpen(true);
                }}
              />
            </div>
          </header>

          {isDemo && <DemoDataBanner onRetry={fleet.reload} />}

          {effectiveView === "workspace" && <nav aria-label="Workspace views" className="lg:hidden bg-panel border-b border-line px-2 sm:px-3 py-1.5 shrink-0 font-semibold">
            <ul className="flex gap-1">
              {mobileItems.map(({ id, label, icon: Icon, badge, badgeLabel, badgeTone, selected, onClick }) => (
                <li key={id} className="flex-1 min-w-0">
                  <button
                    type="button"
                    aria-current={selected ? "page" : undefined}
                    onClick={onClick}
                    className={`w-full flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 min-h-[48px] sm:min-h-[44px] px-1 rounded-md text-label sm:text-small transition-colors cursor-pointer ${
                      selected ? "bg-accent-bg text-accent-ink" : "text-muted hover:text-ink hover:bg-wash"
                    }`}
                  >
                    <span className="relative">
                      <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                      {badge ? (
                        <span className={`absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full ${badgeTone} text-white text-label leading-4 text-center tabular-nums`}>
                          {badge}
                        </span>
                      ) : null}
                    </span>
                    <span className="max-w-full truncate">
                      {label}
                      {badge ? <span className="sr-only">, {badge} {badgeLabel}</span> : null}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>}

          <main id="workspace" tabIndex={-1} className="flex-1 min-h-0 overflow-y-auto p-3 pb-20 lg:p-5 focus:outline-none custom-scrollbar">
            {effectiveView === "approvals" && session.currentUser ? (
              <ApprovalsQueueView apiBase={API_BASE} currentUser={session.currentUser} onCountChange={session.setPendingApprovals} />
            ) : effectiveView === "dashboard" ? (
              <div className="h-full overflow-y-auto custom-scrollbar">
                <AnalyticsDashboardView
                  apiBase={API_BASE}
                  equipmentList={fleet.equipment}
                  demo={isDemo}
                  selectedMachineId={selectedMachineId ?? undefined}
                  onSelectMachine={(id) => { selectMachine(id); setView("asset-detail"); }}
                  onViewAllAssets={() => setView("assets")}
                />
              </div>
            ) : effectiveView === "assets" ? (
              <AssetsView
                equipment={fleet.equipment}
                selectedId={selectedMachineId}
                onSelectAsset={selectMachine}
                onOpenAssetDetail={(mId) => {
                  selectMachine(mId);
                  setView("asset-detail");
                }}
                onQuickDiagnose={(mId) => {
                  selectMachine(mId);
                  setView("diagnostics");
                }}
                chatMessages={chat.messages}
                chatLoading={chat.loading}
                onSendMessage={(msg) => {
                  const context = selectedMachine
                    ? msg + "\n\n[Selected asset: " + selectedMachine.machine_id + " " + selectedMachine.name + "]"
                    : msg;
                  void chat.send(msg, context);
                }}
                onResetChat={chat.reset}
                onOpenCitation={setOpenDocument}
                currentUser={session.currentUser}
                onOpenAuth={() => setSignInOpen(true)}
                apiBase={API_BASE}
              />
            ) : effectiveView === "diagnostics" ? (
              <DiagnosticsView
                equipment={fleet.equipment}
                selectedId={selectedMachineId}
                onSelectAsset={selectMachine}
                onRunDiagnostic={(mId) => runDiagnostic(mId)}
                onInvestigateFault={(code, mId) => {
                  selectMachine(mId);
                  ask(`Diagnose fault code ${code} on ${mId}. What are the immediate corrective actions?`, true);
                }}
              />
            ) : effectiveView === "sops" ? (
              <SopsView onOpenSopDocument={(cit) => setOpenDocument(cit)} />
            ) : effectiveView === "work-orders" ? (
              <WorkOrdersView
                logs={workOrders.logs}
                onSelectWorkOrder={(log) =>
                  ask(
                    `Investigate past maintenance work order #${log.id}: Fault ${log.fault_code} - "${log.action_taken}" on ${selectedMachine?.name ?? "asset"} by ${log.technician}. What recurring risks exist?`,
                    true
                  )
                }
                onCreateWorkOrder={() => {
                  if (selectedMachine) {
                    ask(`Create a preventive maintenance work order for ${selectedMachine.name} (${selectedMachine.machine_id})`, true);
                  } else {
                    setView("assets");
                  }
                }}
              />
            ) : effectiveView === "history" ? (
              <HistoryView equipment={fleet.equipment} onOpenAsset={(id: string) => { selectMachine(id); setView("asset-detail"); }} />
            ) : effectiveView === "settings" ? (
              <SettingsView currentUser={session.currentUser} apiBase={API_BASE} />
            ) : effectiveView === "asset-detail" && selectedMachine ? (
              <AssetDetailView
                machine={selectedMachine}
                workOrders={workOrders.logs}
                onBackToAssets={() => setView("assets")}
                onOpenDiagnostics={() => setView("diagnostics")}
                onOpenSop={() => setView("sops")}
                onCreateWorkOrder={() => {
                  ask(`Generate a corrective work order draft for ${selectedMachine.name} (${selectedMachine.machine_id})`, true);
                }}
                onOpenCitation={setOpenDocument}
                chatMessages={chat.messages}
                chatLoading={chat.loading}
                onCheckAlarm={checkAlarm}
                onRunDiagnostic={runDiagnostic}
              />
            ) : fleet.state !== "ready" || !selectedMachine ? (
              <div className={`${panelClass} h-full flex items-center justify-center p-6`}>
                {fleet.state === "loading" ? (
                  <p className="text-copy text-muted" role="status">
                    Loading the fleet…
                  </p>
                ) : fleet.state === "error" ? (
                  <div role="alert" className="max-w-[44ch] text-center">
                    <CircleAlert className="w-6 h-6 mx-auto text-danger" aria-hidden="true" />
                    <p className="mt-2 text-copy font-semibold text-ink">The fleet didn't load</p>
                    <p className="mt-1 text-copy text-muted">The maintenance service isn't responding. Check that it is running, then try again.</p>
                    <button
                      type="button"
                      onClick={fleet.reload}
                      className="mt-4 min-h-[40px] px-4 rounded-md border border-line-strong bg-panel text-copy font-semibold text-ink hover:bg-sunken cursor-pointer"
                    >
                      Try again
                    </button>
                  </div>
                ) : (
                  <p className="text-copy text-muted" role="status">
                    No assets are registered yet.
                  </p>
                )}
              </div>
            ) : (
              <div className="h-full w-full max-w-[1920px] mx-auto flex flex-col lg:grid lg:grid-cols-[232px_minmax(0,1fr)_264px] xl:grid-cols-[284px_minmax(0,1fr)_320px] 2xl:grid-cols-[304px_minmax(0,1fr)_360px] gap-3 lg:gap-4">
                <div className={`h-full min-h-0 overflow-hidden ${mobileTab === "fleet" ? "flex flex-col flex-1" : "hidden lg:flex lg:flex-col"}`}>
                  <FleetRegisterPanel
                    equipment={fleet.equipment}
                    selectedId={selectedMachine.machine_id}
                    onSelect={selectMachine}
                    searchFilter={fleetSearch}
                    onSearchChange={setFleetSearch}
                    statusFilter={fleetStatusFilter}
                    onStatusFilterChange={setFleetStatusFilter}
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
                    <AssetTabBar
                      machine={selectedMachine}
                      activeTab={activeTab}
                      onTabChange={setActiveTab}
                      compact={headerHidden}
                      workOrderCount={workOrders.logs.length}
                      hasOpenWorkOrder={openLog !== null}
                      sopCount={citedSopCount}
                    />

                    <div id="asset-tabpanel" role="tabpanel" aria-labelledby={`asset-tab-${activeTab}`}>
                      {activeTab === "overview" ? (
                        <ConversationThread
                          messages={chat.messages}
                          loading={chat.loading}
                          chatEndRef={chatEndRef}
                          currentUser={session.currentUser}
                          apiBase={API_BASE}
                          onOpenAuth={() => setSignInOpen(true)}
                          onNewConversation={chat.reset}
                          onOpenCitation={setOpenDocument}
                          assetName={selectedMachine.name}
                          suggestions={[
                            ...(faultCode
                              ? [{ label: `Explain ${faultCode}`, detail: "Trip causes and corrective procedure", tone: "alarm" as const, onClick: checkAlarm }]
                              : []),
                            { label: "Status check", detail: "Operating condition and maintenance history", onClick: runDiagnostic },
                            { label: "Safety SOP", detail: "Step-by-step LOTO checklist and hazards", onClick: openSop },
                            { label: "Recurring faults", detail: "Repeat alarms across past work orders", onClick: auditLogs }
                          ]}
                          lead={
                            selectedMachine.status.toLowerCase() === "fault" ? (
                              <FaultBanner machine={selectedMachine} openLog={openLog} lastLog={workOrders.logs[0] ?? null} logsLoading={workOrders.state === "loading"} onCheckAlarm={checkAlarm} busy={chat.loading} />
                            ) : undefined
                          }
                        />
                      ) : (
                        <div className="px-4 @min-[560px]:px-6 py-5">
                          {activeTab === "diagnostics" && (
                            <DiagnosticsTab
                              machine={selectedMachine}
                              faultCode={faultCode}
                              messages={chat.messages}
                              loading={chat.loading}
                              onCheckAlarm={checkAlarm}
                              onRunDiagnostic={runDiagnostic}
                              onInspectOverdue={inspectOverdue}
                            />
                          )}
                          {activeTab === "sops" && (
                            <SopsTab machine={selectedMachine} messages={chat.messages} loading={chat.loading} onOpenSop={openSop} onOpenCitation={setOpenDocument} />
                          )}
                          {activeTab === "logs" && (
                            <LogsTab logs={workOrders.logs} logsState={workOrders.state} loading={chat.loading} onAuditLogs={auditLogs} />
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <QueryBar input={input} onInputChange={setInput} loading={chat.loading} onSend={(text) => ask(text, true)} assetName={selectedMachine.name} />
                </section>

                <div className={`h-full min-h-0 overflow-hidden ${mobileTab === "telemetry" ? "flex flex-col flex-1" : "hidden lg:flex lg:flex-col"}`}>
                  <TelemetryInspectorPanel
                    machine={selectedMachine}
                    logs={workOrders.logs}
                    logsState={workOrders.state}
                    readings={telemetry.readings}
                    telemetryLoading={telemetry.loading}
                    telemetryFailed={telemetry.failed}
                    demo={telemetry.source === "demo"}
                    faultCode={faultCode}
                    busy={chat.loading}
                    onRunDiagnostic={runDiagnostic}
                    onViewSop={openSop}
                    onViewAllWorkOrders={() => {
                      setActiveTab("logs");
                      setMobileTab("copilot");
                    }}
                    onSelectWorkOrder={(log) =>
                      ask(
                        `Investigate past maintenance work order #${log.id}: Fault ${log.fault_code} - "${log.action_taken}" on ${selectedMachine.name} by ${log.technician}. What recurring risks exist?`
                      )
                    }
                  />
                </div>
              </div>
            )}
          </main>
        </div>

        <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-line bg-panel pb-[env(safe-area-inset-bottom)] lg:hidden">
          {([
            { id: "dashboard" as View, label: "Dashboard", icon: LayoutDashboard },
            { id: "assets" as View, label: "Assets", icon: Factory },
            { id: "work-orders" as View, label: "Orders", icon: ClipboardList }
          ]).map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" aria-current={effectiveView === id ? "page" : undefined}
              className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-label font-medium ${effectiveView === id ? "text-accent" : "text-muted"}`}
              onClick={() => setView(id)}><Icon className="h-5 w-5" aria-hidden="true" />{label}</button>
          ))}
          <button type="button" aria-haspopup="dialog" aria-label="Open navigation menu" className="flex min-h-14 flex-col items-center justify-center gap-0.5 text-label font-medium text-muted"
            onClick={() => mobileDialogRef.current?.showModal()}><Menu className="h-5 w-5" aria-hidden="true" />Menu</button>
        </nav>
        <dialog ref={mobileDialogRef} aria-label="Navigation menu" className="fixed inset-y-0 right-0 m-0 ml-auto h-dvh max-h-dvh w-[min(85vw,340px)] border-l border-line bg-panel p-0 text-ink shadow-xl backdrop:bg-ink/40 lg:hidden">
          <div className="flex items-center justify-between border-b border-line p-4 bg-sunken/40">
            <span className="font-bold text-ink">Navigation</span>
            <button type="button" className="min-h-10 px-3 font-semibold text-accent hover:underline cursor-pointer" onClick={() => mobileDialogRef.current?.close()}>Close</button>
          </div>
          <nav aria-label="All pages" className="p-3 space-y-1">
            {navItems.map(({ id, label, icon: Icon, badge }) => (
              <button
                key={id}
                type="button"
                aria-current={effectiveView === id ? "page" : undefined}
                className={`relative flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-small font-medium transition-colors cursor-pointer ${
                  effectiveView === id
                    ? "bg-accent/10 text-accent font-semibold"
                    : "text-body hover:bg-sunken hover:text-ink"
                }`}
                onClick={() => { setView(id); mobileDialogRef.current?.close(); }}
              >
                {effectiveView === id && <span className="absolute left-1 top-2 bottom-2 w-1 rounded-full bg-accent" aria-hidden="true" />}
                <Icon className={`h-4 w-4 shrink-0 ${effectiveView === id ? "text-accent" : "text-subtle"}`} aria-hidden="true" />
                <span>{label}</span>
                {badge ? (
                  <span className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-warn-bg text-warn-ink border border-warn-line text-[11px] font-mono font-bold tabular-nums flex items-center justify-center">
                    {badge}
                  </span>
                ) : null}
              </button>
            ))}
          </nav>
        </dialog>

        <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
        <DocumentViewer citation={openDocument} apiBase={API_BASE} onClose={() => setOpenDocument(null)} />
      </div>

      {showSignIn && (
        <SignInPage
          apiBase={API_BASE}
          sessionExpired={session.expired}
          onLoginSuccess={session.signedIn}
          onClose={() => {
            setSignInOpen(false);
            session.dismissExpired();
          }}
        />
      )}
    </>
  );
}
