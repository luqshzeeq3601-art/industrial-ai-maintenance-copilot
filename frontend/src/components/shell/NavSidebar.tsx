import { NavLink } from "react-router";
import { Box, ClipboardList, FileText, History, House, Settings, Stethoscope, type LucideIcon } from "lucide-react";
import { cn } from "../../lib/cn";

interface NavEntry {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

// Spec order (DESIGN.md §2)
const NAV: NavEntry[] = [
  { to: "/", label: "Dashboard", icon: House, end: true },
  { to: "/assets", label: "Assets", icon: Box },
  { to: "/diagnostics", label: "Diagnostics", icon: Stethoscope },
  { to: "/sops", label: "SOPs", icon: FileText },
  { to: "/work-orders", label: "Work Orders", icon: ClipboardList },
  { to: "/history", label: "History", icon: History },
  { to: "/settings", label: "Settings", icon: Settings }
];

interface NavSidebarProps {
  /** Approvers see how many decisions wait for them. */
  pendingApprovals?: number;
  /** "rail": icon-only at 768–1023px, labelled from 1024px. "drawer": always labelled. */
  variant?: "rail" | "drawer";
  onNavigate?: () => void;
}

/** Primary navigation: outline icon + label, active row with a blue tint and left accent. */
export function NavSidebar({ pendingApprovals = 0, variant = "rail", onNavigate }: NavSidebarProps) {
  const rail = variant === "rail";
  return (
    <nav aria-label="Primary">
      <ul className="space-y-1">
        {NAV.map(({ to, label, icon: Icon, end }) => {
          const badge = to === "/work-orders" && pendingApprovals > 0 ? pendingApprovals : 0;
          return (
            <li key={to}>
              <NavLink
                to={badge ? "/work-orders?status=approval" : to}
                end={end}
                onClick={onNavigate}
                title={rail ? label : undefined}
                className={({ isActive }) =>
                  cn(
                    "relative flex items-center gap-3 h-11 rounded-[var(--radius-control)] text-small transition-colors duration-150",
                    rail ? "justify-center lg:justify-start px-0 lg:px-3" : "px-3",
                    isActive
                      ? "bg-accent-bg text-accent-ink font-semibold before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:rounded-r before:bg-accent"
                      : "text-body font-medium hover:bg-wash hover:text-ink"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={cn("w-5 h-5 shrink-0", isActive ? "text-accent" : "text-subtle")} strokeWidth={1.75} aria-hidden="true" />
                    <span className={rail ? "sr-only lg:not-sr-only lg:truncate" : "truncate"}>{label}</span>
                    {badge > 0 && (
                      <span
                        className={cn(
                          "min-w-5 h-5 px-1.5 rounded-full bg-warn-solid text-white text-label font-semibold tabular flex items-center justify-center",
                          rail ? "absolute top-0.5 right-1.5 lg:static lg:ml-auto" : "ml-auto"
                        )}
                      >
                        {badge}
                        <span className="sr-only"> awaiting your approval</span>
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
