import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "../../lib/cn";

export interface TabItem<T extends string> {
  id: T;
  label: string;
  /** Optional count shown after the label. */
  count?: number;
}

interface TabsProps<T extends string> {
  label: string;
  items: TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  /** Prefix for tab/panel ids so each tab controls `${idBase}-panel`. */
  idBase: string;
  variant?: "underline" | "segmented";
  className?: string;
}

/** ARIA tabs with arrow-key movement. The owning page keeps `value` in the URL. */
export function Tabs<T extends string>({ label, items, value, onChange, idBase, variant = "underline", className }: TabsProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: KeyboardEvent, index: number) => {
    const delta = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    const target = e.key === "Home" ? 0 : e.key === "End" ? items.length - 1 : delta ? (index + delta + items.length) % items.length : -1;
    if (target < 0) return;
    e.preventDefault();
    refs.current[target]?.focus();
    onChange(items[target]!.id);
  };

  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn(
        "flex max-w-full overflow-x-auto custom-scrollbar",
        variant === "underline" ? "gap-6 border-b border-line" : "gap-2",
        className
      )}
    >
      {items.map((item, i) => {
        const selected = item.id === value;
        return (
          <button
            key={item.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`${idBase}-tab-${item.id}`}
            aria-selected={selected}
            aria-controls={`${idBase}-panel`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(item.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              "shrink-0 inline-flex items-center gap-2 text-small whitespace-nowrap cursor-pointer transition-colors duration-150",
              variant === "underline"
                ? cn(
                    "h-11 -mb-px border-b-2 font-semibold",
                    selected ? "border-accent text-accent" : "border-transparent text-body hover:text-ink hover:border-line-strong"
                  )
                : cn(
                    "h-10 px-4 rounded-[var(--radius-control)] border font-medium",
                    selected ? "border-accent bg-accent-bg text-accent-ink" : "border-line bg-panel text-body hover:bg-sunken hover:text-ink"
                  )
            )}
          >
            {item.label}
            {item.count != null && (
              <span className={cn("min-w-5 px-1.5 rounded text-label font-semibold tabular", selected ? "bg-accent text-white" : "bg-wash text-body")}>
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({ idBase, value, children, className }: { idBase: string; value: string; children: ReactNode; className?: string }) {
  return (
    <div role="tabpanel" id={`${idBase}-panel`} aria-labelledby={`${idBase}-tab-${value}`} className={className}>
      {children}
    </div>
  );
}
