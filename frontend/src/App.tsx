import { useEffect, useRef, useState } from "react";
import { BarChart3, CircleAlert, CircleHelp, Factory, LayoutDashboard, MessageSquare, RotateCw, Server, ShieldCheck } from "lucide-react";
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
import { StatusFilterBar } from "./components/shell/StatusFilterBar";
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

type MobileTab = "fleet" | "copilot" | "telemetry";
type View = "workspace" | "dashboard" | "approvals";

const ASSET_TABS: AssetTab[] = ["overview", "diagnostics", "sops", "logs"];
const VIEWS: View[] = ["workspace", "dashboard", "approvals"];

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
  const effectiveView: View = view === "approvals" && !session.isApprover ? "workspace" : view;

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
    // Answers render in the Overview conversation
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
    setView("workspace");
    setMobileTab("copilot");
  };

  const toggleStatusFilter = (status: string) => {
    setFleetStatusFilter((curr) => (curr === status ? null : status));
    setView("workspace");
    setMobileTab("fleet");
  };

  // The alarm is the most recent open work order; closed history never reads as an active fault
  const openLog = workOrders.logs.find(isOpenWorkOrder) ?? null;
  const faultCode = openLog?.fault_code ?? null;
  const countStatus = (status: string) => fleet.equipment.filter((e) => e.status.toLowerCase() === status).length;
  const citedSopCount = new Set(
    chat.messages.flatMap((m) => (m.citations ?? []).map((c) => `${c.document || c.source}-${c.page ?? ""}`))
  ).size;

  const machine = selectedMachine;
  const checkAlarm = () =>
    machine &&
    ask(`What does ${faultCode ? `fault code ${faultCode}` : "the active fault"} mean on ${machine.name} (${machine.machine_id}) and what is the corrective procedure?`);
  const openSop = () =>
    machine &&
    ask(`Give me the step-by-step SOP and LOTO safety rules for ${faultCode ? `fault ${faultCode}` : "servicing"} on ${machine.name} (${machine.machine_id}, ${machine.type})`);
  const auditLogs = () => machine && ask(`Investigate recurring faults and maintenance history for ${machine.machine_id} (${machine.name})`);
  const runDiagnostic = () => machine && ask(`Check maintenance history and operating status for ${machine.machine_id} (${machine.name})`);
  const inspectOverdue = () =>
    machine && ask(`What is the recommended maintenance procedure for ${machine.name} (${machine.machine_id}) to address overdue maintenance hours?`);

  const navItems: NavItem<View>[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "workspace", label: "Assets", icon: Factory },
    ...(session.isApprover ? [{ id: "approvals" as const, label: "Approvals", icon: ShieldCheck, badge: session.pendingApprovals }] : [])
  ];
  const mobileItems = [
    ...(["fleet", "copilot", "telemetry"] as const).map((id) => ({
      id,
      label: id === "fleet" ? "Fleet" : id === "copilot" ? "Asset" : "Telemetry",
      icon: id === "fleet" ? Server : id === "copilot" ? MessageSquare : BarChart3,
      // Phones have no status bar, so the fleet tab carries the fault count
      badge: id === "fleet" ? countStatus("fault") : 0,
      badgeLabel: "in fault",
      badgeTone: "bg-danger-solid",
      selected: effectiveView === "workspace" && mobileTab === id,
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
        badge: item.badge ?? 0,
        badgeLabel: "waiting",
        badgeTone: "bg-warn-solid",
        selected: effectiveView === item.id,
        onClick: () => setView(item.id)
      }))
  ];

  const panelClass = "bg-panel rounded-lg border border-line-strong/70 shadow-[var(--shadow-cockpit)]";

  return (
    <>
      <div inert={showSignIn} className="relative flex h-[100dvh] min-h-[100dvh] w-full bg-paper text-ink antialiased overflow-clip font-sans">
        <a href="#workspace" className="skip-link">
          Skip to workspace
        </a>

        <PrimarySidebar
          items={navItems}
          active={effectiveView}
          onNavigate={setView}
          onOpenHelp={() => setHelpOpen(true)}
        />

        <div className="flex-1 min-w-0 flex flex-col">
          <header className="h-[60px] shrink-0 flex items-center gap-3 px-3 sm:px-4 lg:px-5 bg-panel border-b border-line">
            <ProductMark className="lg:hidden w-7 h-7 shrink-0" />
            <span className="lg:hidden text-copy font-semibold text-ink tracking-tight truncate">Maintenance Copilot</span>

            {fleet.state === "ready" && fleet.equipment.length > 0 && (
              <StatusFilterBar
                total={fleet.equipment.length}
                running={countStatus("operational")}
                faults={countStatus("fault")}
                maintenance={countStatus("maintenance")}
                active={fleetStatusFilter}
                onToggle={toggleStatusFilter}
              />
            )}

            <div className="ml-auto shrink-0 flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1.5 text-label text-muted">
                <span>Updated <time className="font-mono tabular-nums">{new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</time></span>
                <button
                  type="button"
                  onClick={() => fleet.reload()}
                  aria-label="Refresh data"
                  title="Refresh data"
                  className="p-1 rounded-md hover:bg-wash text-muted hover:text-ink transition-colors cursor-pointer"
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

          {/* Navigation below 1024px */}
          <nav aria-label="Workspace views" className="lg:hidden bg-panel border-b border-line px-2 sm:px-3 py-1.5 shrink-0 font-semibold">
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
          </nav>

          <main id="workspace" tabIndex={-1} className="flex-1 min-h-0 p-3 lg:p-4 overflow-clip focus:outline-none">
            {effectiveView === "approvals" && session.currentUser ? (
              <ApprovalsQueueView apiBase={API_BASE} currentUser={session.currentUser} onCountChange={session.setPendingApprovals} />
            ) : effectiveView === "dashboard" ? (
              <div className="h-full overflow-y-auto custom-scrollbar">
                <AnalyticsDashboardView
                  apiBase={API_BASE}
                  equipmentList={fleet.equipment}
                  demo={isDemo}
                  selectedMachineId={selectedMachineId ?? undefined}
                  onSelectMachine={selectMachine}
                />
              </div>
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
