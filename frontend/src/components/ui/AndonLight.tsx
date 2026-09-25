import { cn } from "../../lib/cn";

type Lamp = "fault" | "maintenance" | "running";

const LAMPS: { id: Lamp; on: string; label: string }[] = [
  { id: "fault", on: "bg-status-fault", label: "Fault" },
  { id: "maintenance", on: "bg-status-maint", label: "Maintenance" },
  { id: "running", on: "bg-status-ok", label: "Running" }
];

function lampFor(status: string): Lamp | null {
  switch (status.toLowerCase()) {
    case "fault":
      return "fault";
    case "maintenance":
      return "maintenance";
    case "operational":
      return "running";
    default:
      return null; // offline: every lamp dark
  }
}

/**
 * Andon stack light: red over amber over green, as on a shop-floor signal tower. Only the current state's
 * lamp is lit, so state reads from position as well as color. Decorative for assistive tech — the status
 * label beside it carries the meaning.
 */
export function AndonLight({ status, size = "md", className }: { status: string; size?: "md" | "lg"; className?: string }) {
  const lit = lampFor(status);
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex flex-col items-center gap-[3px] p-[3px] rounded-[5px] bg-ink/90 shrink-0",
        size === "lg" ? "w-[14px]" : "w-[11px]",
        className
      )}
    >
      {LAMPS.map((lamp) => (
        <span
          key={lamp.id}
          data-lit={lamp.id === lit || undefined}
          className={cn(
            "w-full rounded-[2px]",
            size === "lg" ? "h-[12px]" : "h-[9px]",
            lamp.id === lit ? lamp.on : "bg-white/15"
          )}
        />
      ))}
    </span>
  );
}
