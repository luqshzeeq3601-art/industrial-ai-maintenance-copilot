import { useEffect, useRef } from "react";
import { X } from "lucide-react";

const SHORTCUTS: { keys: string[]; action: string }[] = [
  { keys: ["/"], action: "Search the fleet register" },
  { keys: ["↑", "↓"], action: "Move between assets in the fleet register" },
  { keys: ["Home", "End"], action: "Jump to the first or last asset" },
  { keys: ["←", "→"], action: "Switch asset tabs" },
  { keys: ["Enter"], action: "Send a question to the copilot" },
  { keys: ["Shift", "Enter"], action: "New line in a question" },
  { keys: ["Esc"], action: "Clear a search or close a menu" }
];

interface HelpDialogProps {
  open: boolean;
  onClose: () => void;
}

/** Keyboard shortcuts and support contact. Native <dialog> keeps focus inside and closes on Escape. */
export function HelpDialog({ open, onClose }: HelpDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal?.();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-labelledby="help-title"
      className="m-auto w-[min(440px,calc(100vw-32px))] rounded-lg border border-line bg-panel text-ink p-0 shadow-[var(--shadow-tinted-md)] backdrop:bg-deck/40"
    >
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-line">
        <h2 id="help-title" className="text-title font-semibold">
          Help and shortcuts
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close help"
          className="w-9 h-9 -mr-2 rounded-md flex items-center justify-center text-muted hover:text-ink hover:bg-wash cursor-pointer"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
      <div className="px-5 py-4">
        <h3 className="text-small font-semibold text-ink">Keyboard</h3>
        <dl className="mt-2 divide-y divide-line">
          {SHORTCUTS.map(({ keys, action }) => (
            <div key={action} className="flex items-center justify-between gap-4 py-2">
              <dt className="text-small text-body">{action}</dt>
              <dd className="flex shrink-0 gap-1">
                {keys.map((k) => (
                  <kbd key={k} className="min-w-[24px] h-6 px-1.5 rounded border border-line bg-sunken text-label font-mono text-muted flex items-center justify-center">
                    {k}
                  </kbd>
                ))}
              </dd>
            </div>
          ))}
        </dl>
        <h3 className="mt-5 text-small font-semibold text-ink">Access and support</h3>
        <p className="mt-1 text-small text-body">
          Accounts, roles, and password resets are managed by your plant administrator. The copilot answers only from
          indexed manuals, SOPs, and work orders; always follow site LOTO procedures before servicing equipment.
        </p>
      </div>
    </dialog>
  );
}
