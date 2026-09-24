import { Monitor, Moon, Sun } from "lucide-react";
import type { ThemePreference } from "../../hooks/useTheme";

const OPTIONS: { id: ThemePreference; label: string; icon: typeof Sun }[] = [
  { id: "system", label: "System", icon: Monitor },
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon }
];

interface ThemeSwitcherProps {
  preference: ThemePreference;
  onChange: (preference: ThemePreference) => void;
  /** Icon-only single button that cycles System → Light → Dark (narrow sidebar, mobile header). */
  compact?: boolean;
  /** Show a hover/focus tooltip to the right (collapsed sidebar). */
  tooltip?: boolean;
  className?: string;
}

export function ThemeSwitcher({ preference, onChange, compact = false, tooltip = false, className = "" }: ThemeSwitcherProps) {
  if (compact) {
    const index = OPTIONS.findIndex((o) => o.id === preference);
    const current = OPTIONS[index];
    const next = OPTIONS[(index + 1) % OPTIONS.length];
    const Icon = current.icon;
    return (
      <button
        type="button"
        onClick={() => onChange(next.id)}
        aria-label={`Theme: ${current.label}. Switch to ${next.label}.`}
        className={`group relative w-10 h-10 pointer-coarse:w-11 pointer-coarse:h-11 rounded-md flex items-center justify-center text-muted hover:text-ink hover:bg-wash transition-colors cursor-pointer ${className}`}
      >
        <Icon className="w-[18px] h-[18px]" strokeWidth={1.75} aria-hidden="true" />
        {tooltip && (
          <span className="tooltip" aria-hidden="true">
            Theme: {current.label}
          </span>
        )}
      </button>
    );
  }

  return (
    <div role="radiogroup" aria-label="Theme" className={`grid grid-cols-3 gap-0.5 p-0.5 rounded-md bg-wash ${className}`}>
      {OPTIONS.map(({ id, label, icon: Icon }) => {
        const on = preference === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(id)}
            onKeyDown={(e) => {
              if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
              e.preventDefault();
              const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : OPTIONS.length - 1;
              const target = OPTIONS[(OPTIONS.findIndex((o) => o.id === id) + step) % OPTIONS.length];
              onChange(target.id);
              (e.currentTarget.parentElement?.querySelector(`[data-theme-option="${target.id}"]`) as HTMLElement | null)?.focus();
            }}
            data-theme-option={id}
            className={`flex items-center justify-center gap-1.5 min-h-[32px] pointer-coarse:min-h-[44px] rounded text-meta font-medium transition-colors cursor-pointer ${
              on ? "bg-panel text-ink shadow-[var(--shadow-tinted-xs)]" : "text-muted hover:text-ink"
            }`}
          >
            <Icon className="w-3.5 h-3.5" aria-hidden="true" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
