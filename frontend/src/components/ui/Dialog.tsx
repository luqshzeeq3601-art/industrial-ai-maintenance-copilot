import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "../../lib/cn";
import { IconButton } from "./Button";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** "drawer" slides in from the right (work order detail); "modal" is centered. */
  variant?: "modal" | "drawer";
  className?: string;
}

/** Native <dialog>: focus trap, Escape to close, and focus return are handled by the browser. */
export function Dialog({ open, onClose, title, description, children, footer, variant = "modal", className }: DialogProps) {
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
      aria-labelledby="dialog-title"
      aria-describedby={description ? "dialog-description" : undefined}
      className={cn(
        "bg-panel text-ink p-0 border border-line shadow-[var(--shadow-overlay)] backdrop:bg-ink/40",
        variant === "drawer"
          ? "ml-auto mr-0 my-0 h-dvh max-h-dvh w-[min(480px,100vw)] rounded-none"
          : "m-auto w-[min(560px,calc(100vw-32px))] max-h-[min(90dvh,860px)] rounded-[var(--radius-card)]",
        className
      )}
    >
      {open && (
        <div className="flex flex-col h-full max-h-[inherit]">
          <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-line">
            <div className="min-w-0">
              <h2 id="dialog-title" className="text-section font-semibold">
                {title}
              </h2>
              {description && (
                <p id="dialog-description" className="mt-0.5 text-meta text-body">
                  {description}
                </p>
              )}
            </div>
            <IconButton label="Close" icon={X} size="sm" onClick={onClose} className="-mr-2" />
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-5 py-4">{children}</div>
          {footer && <div className="flex flex-wrap justify-end gap-2 px-5 py-3 border-t border-line bg-sunken">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}
