import { useRef, type KeyboardEvent } from "react";
import { cn } from "../../lib/cn";

interface SegmentedControlProps<T extends string> {
  label: string;
  options: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
}

/** Single-choice filter (e.g. time range) as a radio group with arrow-key movement. */
export function SegmentedControl<T extends string>({ label, options, value, onChange }: SegmentedControlProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKeyDown = (e: KeyboardEvent, i: number) => {
    const delta = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = (i + delta + options.length) % options.length;
    refs.current[next]?.focus();
    onChange(options[next]!.id);
  };

  return (
    <div role="radiogroup" aria-label={label} className="inline-flex p-1 rounded-[var(--radius-control)] border border-line bg-panel">
      {options.map((o, i) => {
        const on = o.id === value;
        return (
          <button
            key={o.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(o.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              "h-9 px-3.5 rounded-md text-small whitespace-nowrap cursor-pointer transition-colors duration-150",
              on ? "bg-accent-bg text-accent-ink font-semibold ring-1 ring-accent-line" : "text-body font-medium hover:text-ink hover:bg-wash"
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
