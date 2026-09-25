import { Suspense, useEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router";
import { Menu as MenuIcon, X } from "lucide-react";
import { CopilotProvider } from "../../app/copilot";
import { useSessionContext } from "../../app/sessionContext";
import { useEquipment, useProfile, useWorkOrders } from "../../api/queries";
import { ProductMark } from "../auth/SignInArt";
import { IconButton } from "../ui/Button";
import { AccountMenu } from "./AccountMenu";
import { DemoDataBanner } from "./DemoDataBanner";
import { GlobalSearch } from "./GlobalSearch";
import { NavSidebar } from "./NavSidebar";
import { PageErrorBoundary } from "./PageErrorBoundary";
import { PageSkeleton } from "./PageSkeleton";

/** Header + sidebar frame shared by every signed-in page. */
export function AppShell() {
  const session = useSessionContext();
  const user = session.currentUser!;
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const drawerRef = useRef<HTMLDialogElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const equipment = useEquipment();
  const profile = useProfile();
  // Approvers see work orders and copilot requests waiting for a decision
  const pendingOrders = useWorkOrders({ statuses: ["pending"], page_size: 1 });
  const waiting = session.isApprover ? session.pendingApprovals + (pendingOrders.data?.total ?? 0) : 0;
  const firstRender = useRef(true);

  // New page: start at the top and move focus to the content for screen-reader users
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    window.scrollTo({ top: 0 });
    mainRef.current?.focus({ preventScroll: true });
  }, [location.pathname]);

  useEffect(() => {
    const d = drawerRef.current;
    if (!d) return;
    if (drawerOpen && !d.open) d.showModal?.();
    if (!drawerOpen && d.open) d.close();
  }, [drawerOpen]);

  const plant = profile.data?.plant;

  return (
    <CopilotProvider>
    <div className="min-h-dvh bg-paper text-ink">
      <a href="#main" className="skip-link">
        Skip to content
      </a>

      <header className="sticky top-0 z-[var(--z-drawer)] h-16 bg-panel border-b border-line flex items-center gap-3 pr-3 md:pr-5">
        <div className="flex items-center gap-2.5 pl-3 md:pl-5 md:w-[72px] lg:w-[208px] wide:w-[232px] shrink-0">
          <IconButton label="Open navigation" icon={MenuIcon} className="md:hidden -ml-1" onClick={() => setDrawerOpen(true)} />
          <ProductMark className="w-8 h-8 shrink-0" />
          <span className="md:hidden lg:inline text-title font-semibold tracking-[-0.01em] whitespace-nowrap">Maintenance Copilot</span>
        </div>
        {plant && (
          <span className="hidden lg:inline-flex items-center h-10 px-3 rounded-[var(--radius-control)] border border-line text-small text-ink whitespace-nowrap">
            <span className="sr-only">Plant: </span>
            {plant}
          </span>
        )}
        <div className="hidden sm:flex flex-1 justify-center min-w-0 px-2">
          <GlobalSearch />
        </div>
        <div className="ml-auto sm:ml-0 shrink-0">
          <AccountMenu user={user} onSignedOut={session.signedOut} />
        </div>
      </header>

      {equipment.data?.source === "demo" && <DemoDataBanner onRetry={() => void equipment.refetch()} />}

      <div className="flex">
        <aside className="hidden md:block shrink-0 sticky top-16 h-[calc(100dvh-64px)] overflow-y-auto border-r border-line bg-panel w-[72px] lg:w-[208px] wide:w-[232px] px-3 py-4">
          <NavSidebar pendingApprovals={waiting} />
        </aside>

        <main id="main" ref={mainRef} tabIndex={-1} className="flex-1 min-w-0 px-4 md:px-6 wide:px-8 py-6 focus:outline-none">
          <div className="mx-auto max-w-[1680px]">
            <PageErrorBoundary resetKey={location.pathname}>
              <Suspense fallback={<PageSkeleton />}>
                <Outlet />
              </Suspense>
            </PageErrorBoundary>
          </div>
        </main>
      </div>

      {/* Phone navigation drawer */}
      <dialog
        ref={drawerRef}
        onClose={() => setDrawerOpen(false)}
        onClick={(e) => e.target === drawerRef.current && setDrawerOpen(false)}
        aria-label="Navigation"
        className="m-0 h-dvh max-h-dvh w-[min(300px,85vw)] bg-panel p-0 border-r border-line backdrop:bg-ink/40"
      >
        {drawerOpen && (
          <div className="flex flex-col gap-4 p-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2.5">
                <ProductMark className="w-8 h-8" />
                <span className="text-title font-semibold">Maintenance Copilot</span>
              </span>
              <IconButton label="Close navigation" icon={X} onClick={() => setDrawerOpen(false)} />
            </div>
            <div className="sm:hidden">
              <GlobalSearch />
            </div>
            <NavSidebar variant="drawer" pendingApprovals={waiting} onNavigate={() => setDrawerOpen(false)} />
          </div>
        )}
      </dialog>
    </div>
    </CopilotProvider>
  );
}
