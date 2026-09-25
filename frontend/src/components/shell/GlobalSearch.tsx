import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useNavigate } from "react-router";
import { Box, ClipboardList, FileText, Search, type LucideIcon } from "lucide-react";
import { useSearch } from "../../api/queries";
import { cn } from "../../lib/cn";

interface Result {
  key: string;
  group: string;
  icon: LucideIcon;
  primary: string;
  secondary: string;
  to: string;
}

/** Header combobox over assets, work orders, and SOPs. Arrow keys move, Enter opens, Escape closes. */
export function GlobalSearch() {
  const navigate = useNavigate();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(term), 200);
    return () => window.clearTimeout(t);
  }, [term]);

  const { data, isFetching, isError } = useSearch(debounced);

  const results = useMemo<Result[]>(() => {
    if (!data || debounced.trim().length < 2) return [];
    return [
      ...data.assets.map((a) => ({
        key: `a-${a.machine_id}`,
        group: "Assets",
        icon: Box,
        primary: a.name,
        secondary: a.machine_id,
        to: `/assets/${a.machine_id}`
      })),
      ...data.work_orders.map((w) => ({
        key: `w-${w.work_order_id}`,
        group: "Work orders",
        icon: ClipboardList,
        primary: w.title,
        secondary: w.work_order_id,
        to: `/work-orders/${w.work_order_id}`
      })),
      ...data.sops.map((s) => ({
        key: `s-${s.id}`,
        group: "SOPs",
        icon: FileText,
        primary: s.title,
        secondary: s.id,
        to: `/sops?open=${encodeURIComponent(s.file)}`
      }))
    ];
  }, [data, debounced]);

  const go = (result: Result) => {
    setOpen(false);
    setTerm("");
    inputRef.current?.blur();
    navigate(result.to);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!results.length) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i + (e.key === "ArrowDown" ? 1 : -1) + results.length) % results.length);
    } else if (e.key === "Enter" && open) {
      e.preventDefault();
      go(results[active]!);
    }
  };

  const showList = open && debounced.trim().length >= 2;

  return (
    <div className="relative w-full max-w-[460px]" onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setOpen(false)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle pointer-events-none" aria-hidden="true" />
      <input
        ref={inputRef}
        type="search"
        role="combobox"
        aria-label="Search assets, work orders, SOPs"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && results[active] ? `${listId}-${active}` : undefined}
        value={term}
        onChange={(e) => {
          setTerm(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Search assets, work orders, SOPs…"
        className="w-full h-10 pl-9 pr-3 rounded-[var(--radius-control)] border border-line bg-sunken text-small text-ink placeholder:text-subtle hover:border-line-strong focus:bg-panel focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent"
      />
      {showList && (
        <div
          className="absolute left-0 right-0 top-full mt-1.5 z-[var(--z-pop)] bg-panel border border-line rounded-[var(--radius-control)] shadow-[var(--shadow-overlay)] overflow-hidden"
        >
          <ul id={listId} role="listbox" aria-label="Search results" className="max-h-[360px] overflow-y-auto custom-scrollbar p-1">
            {results.map((r, i) => (
              <li
                key={r.key}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                tabIndex={-1}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => go(r)}
                onMouseEnter={() => setActive(i)}
                className={cn("flex items-center gap-3 h-11 px-2.5 rounded-md cursor-pointer", i === active && "bg-wash")}
              >
                <r.icon className="w-4 h-4 shrink-0 text-subtle" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-small text-ink">{r.primary}</span>
                <span className="shrink-0 font-data text-label text-body">{r.secondary}</span>
                <span className="sr-only">, {r.group}</span>
              </li>
            ))}
          </ul>
          {results.length === 0 && (
            <p role="status" className="px-3 py-3 text-meta text-body">
              {isError ? "Search isn't available right now." : isFetching ? "Searching…" : `No matches for “${debounced.trim()}”.`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
