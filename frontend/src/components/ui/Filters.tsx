import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown, RotateCcw, Search } from "lucide-react";
import { cn } from "../../lib/cn";
import { controlClass } from "../../lib/styles";
import { Button } from "./Button";


interface SearchInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  /** Debounce before onChange fires, so typing doesn't refetch per keystroke. */
  debounceMs?: number;
}

export function SearchInput({ label, value, onChange, placeholder, className, debounceMs = 250 }: SearchInputProps) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  useEffect(() => {
    if (draft === value) return;
    const t = window.setTimeout(() => onChange(draft), debounceMs);
    return () => window.clearTimeout(t);
  }, [draft, value, onChange, debounceMs]);

  return (
    <label className={cn("relative block min-w-0", className)}>
      <span className="sr-only">{label}</span>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle pointer-events-none" aria-hidden="true" />
      <input
        type="search"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={placeholder}
        className={cn(controlClass, "pl-9 pr-3 placeholder:text-subtle")}
      />
    </label>
  );
}

interface SelectFilterProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** First option, selected when the filter is off (value ""). Omit when a value is always chosen. */
  allLabel?: string;
  options: { value: string; label: string }[];
  className?: string;
  /** Show the label above the control (History page) instead of screen-reader only. */
  visibleLabel?: boolean;
  icon?: ReactNode;
}

/** Native select: keyboard, screen reader and touch behavior come for free. */
export function SelectFilter({ label, value, onChange, allLabel, options, className, visibleLabel = false, icon }: SelectFilterProps) {
  return (
    <label className={cn("block min-w-0", className)}>
      <span className={visibleLabel ? "block mb-1.5 text-meta font-semibold text-ink" : "sr-only"}>{label}</span>
      <span className="relative block">
        {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle pointer-events-none">{icon}</span>}
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(controlClass, "appearance-none pr-9 cursor-pointer", icon ? "pl-9" : "pl-3")}
        >
          {allLabel !== undefined && <option value="">{allLabel}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle pointer-events-none" aria-hidden="true" />
      </span>
    </label>
  );
}

export function ResetButton({ onClick, disabled, label = "Reset" }: { onClick: () => void; disabled?: boolean; label?: string }) {
  return (
    <Button variant="ghost" icon={RotateCcw} onClick={onClick} disabled={disabled}>
      {label}
    </Button>
  );
}

