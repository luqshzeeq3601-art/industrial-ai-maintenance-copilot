import { CircleHelp, type LucideIcon } from "lucide-react";
import { ProductMark } from "../auth/SignInArt";

export interface NavItem<T extends string> {
  id: T;
  label: string;
  icon: LucideIcon;
  badge?: number;
  group?: "operations" | "maintenance" | "system";
}

interface PrimarySidebarProps<T extends string> {
  items: NavItem<T>[];
  active: T;
  onNavigate: (id: T) => void;
  onOpenHelp: () => void;
}

const GROUP_LABELS: Record<string, string> = {
  operations: "Fleet & Diagnostics",
  maintenance: "Operations & Records",
  system: "System & Config"
};

/** Desktop operations navigation with precision industrial hierarchy and anti-slop micro-interactions. */
export function PrimarySidebar<T extends string>({ items, active, onNavigate, onOpenHelp }: PrimarySidebarProps<T>) {
  const groupedItems = items.reduce<Record<string, NavItem<T>[]>>((acc, item) => {
    let group = item.group;
    if (!group) {
      if (["dashboard", "assets", "diagnostics"].includes(item.id)) group = "operations";
      else if (["work-orders", "sops", "history"].includes(item.id)) group = "maintenance";
      else group = "system";
    }
    if (!acc[group]) acc[group] = [];
    acc[group].push(item);
    return acc;
  }, {});

  const groupKeys = (["operations", "maintenance", "system"] as const).filter(
    (key) => groupedItems[key] && groupedItems[key].length > 0
  );

  return (
    <aside
      aria-label="Primary"
      className="hidden lg:flex flex-col w-[228px] shrink-0 bg-panel border-r border-line select-none"
    >
      {/* Precision Brand Header */}
      <div className="h-[60px] shrink-0 flex items-center justify-between px-4 border-b border-line">
        <div className="flex items-center gap-2.5 min-w-0">
          <ProductMark className="w-7 h-7 shrink-0 text-accent" />
          <div className="min-w-0">
            <span className="text-copy font-bold text-ink tracking-tight block truncate leading-tight">
              Maintenance Copilot
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted font-medium">
                Telemetry Active
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grouped Navigation */}
      <nav aria-label="Main Navigation" className="flex-1 px-2.5 py-3 overflow-y-auto custom-scrollbar space-y-4">
        {groupKeys.map((grpKey) => {
          const groupList = groupedItems[grpKey];
          if (!groupList || groupList.length === 0) return null;

          return (
            <div key={grpKey} className="space-y-1">
              <div className="px-2.5 py-1 flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted">
                  {GROUP_LABELS[grpKey] ?? grpKey}
                </span>
              </div>
              <ul className="space-y-0.5" role="list">
                {groupList.map(({ id, label, icon: Icon, badge = 0 }) => {
                  const on = active === id;
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        onClick={() => onNavigate(id)}
                        aria-current={on ? "page" : undefined}
                        className={`group relative w-full flex items-center gap-2.5 min-h-[40px] px-2.5 rounded-lg text-small transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                          on
                            ? "bg-accent/10 text-accent font-semibold shadow-2xs"
                            : "text-body font-medium hover:bg-sunken hover:text-ink active:scale-[0.99]"
                        }`}
                      >
                        {/* Precision Left Inset Indicator */}
                        {on && (
                          <span
                            className="absolute left-1 top-2 bottom-2 w-1 rounded-full bg-accent"
                            aria-hidden="true"
                          />
                        )}

                        <Icon
                          className={`w-[18px] h-[18px] shrink-0 transition-colors ${
                            on ? "text-accent" : "text-subtle group-hover:text-ink"
                          }`}
                          strokeWidth={on ? 2 : 1.75}
                          aria-hidden="true"
                        />
                        <span className="truncate">{label}</span>

                        {badge > 0 && (
                          <span className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-warn-bg text-warn-ink border border-warn-line text-[11px] font-mono font-bold tabular-nums flex items-center justify-center shadow-2xs">
                            {badge}
                            <span className="sr-only"> waiting</span>
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* Pro Utility Footer */}
      <div className="p-2.5 border-t border-line bg-sunken/30">
        <button
          type="button"
          onClick={onOpenHelp}
          className="group w-full flex items-center justify-between min-h-[38px] px-2.5 rounded-lg text-small font-medium text-muted hover:text-ink hover:bg-sunken transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent active:scale-[0.99]"
        >
          <div className="flex items-center gap-2.5">
            <CircleHelp className="w-4 h-4 text-subtle group-hover:text-ink transition-colors" strokeWidth={1.75} aria-hidden="true" />
            <span>Help and shortcuts</span>
          </div>
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-muted bg-panel border border-line rounded shadow-2xs">
            ?
          </kbd>
        </button>
      </div>
    </aside>
  );
}
