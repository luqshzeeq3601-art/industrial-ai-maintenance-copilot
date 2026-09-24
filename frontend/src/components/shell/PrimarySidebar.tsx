import { CircleHelp, type LucideIcon } from "lucide-react";
import { ProductMark } from "../auth/SignInArt";

export interface NavItem<T extends string> {
  id: T;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

interface PrimarySidebarProps<T extends string> {
  items: NavItem<T>[];
  active: T;
  onNavigate: (id: T) => void;
  onOpenHelp: () => void;
}

/** Main navigation from 1024px: icons with tooltips at lg, labels at xl. Help sits at the bottom. */
export function PrimarySidebar<T extends string>({ items, active, onNavigate, onOpenHelp }: PrimarySidebarProps<T>) {
  return (
    <aside aria-label="Primary" className="hidden lg:flex flex-col w-[68px] xl:w-[210px] shrink-0 bg-panel border-r border-line">
      <div className="h-[60px] shrink-0 flex items-center gap-2.5 px-4 justify-center xl:justify-start border-b border-line">
        <ProductMark className="w-7 h-7 shrink-0 text-blue-600" />
        <span className="hidden xl:block text-copy font-bold text-ink tracking-tight whitespace-nowrap">Maintenance Copilot</span>
      </div>

      <nav className="flex-1 px-3 pt-3">
        <ul className="space-y-1">
          {items.map(({ id, label, icon: Icon, badge = 0 }) => {
            const on = active === id;
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => onNavigate(id)}
                  aria-current={on ? "page" : undefined}
                  className={`group relative w-full flex items-center gap-3 min-h-[42px] pointer-coarse:min-h-[44px] px-3 rounded-lg text-small transition-all cursor-pointer justify-center xl:justify-start ${
                    on
                      ? "bg-blue-50 text-blue-700 font-semibold border border-blue-200/80 shadow-xs"
                      : "text-slate-600 font-medium hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <Icon className={`w-[19px] h-[19px] shrink-0 ${on ? "text-blue-600" : "text-slate-400 group-hover:text-slate-700"}`} strokeWidth={1.75} aria-hidden="true" />
                  <span className="sr-only xl:not-sr-only truncate">{label}</span>
                  {badge > 0 && (
                    <span className="absolute top-1 right-1 xl:static xl:ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-warn-solid text-white text-label font-semibold tabular-nums flex items-center justify-center">
                      {badge}
                      <span className="sr-only"> waiting</span>
                    </span>
                  )}
                  <span className="tooltip xl:hidden" aria-hidden="true">
                    {badge > 0 ? `${label} (${badge} waiting)` : label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="px-2.5 py-3 border-t border-line">
        <button
          type="button"
          onClick={onOpenHelp}
          className="group relative w-full flex items-center gap-3 min-h-[40px] pointer-coarse:min-h-[44px] px-3 rounded-lg text-small font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer justify-center xl:justify-start"
        >
          <CircleHelp className="w-[18px] h-[18px] shrink-0 text-slate-400 group-hover:text-slate-700" strokeWidth={1.75} aria-hidden="true" />
          <span className="sr-only xl:not-sr-only">Help and shortcuts</span>
          <span className="tooltip xl:hidden" aria-hidden="true">
            Help and shortcuts
          </span>
        </button>
      </div>
    </aside>
  );
}
