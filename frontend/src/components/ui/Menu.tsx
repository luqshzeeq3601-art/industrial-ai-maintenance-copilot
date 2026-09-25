import type { ReactNode } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { MoreHorizontal, type LucideIcon } from "lucide-react";
import { cn } from "../../lib/cn";

export interface MenuAction {
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
  disabled?: boolean;
  destructive?: boolean;
}

interface MenuProps {
  /** Accessible name of the trigger, e.g. "Actions for EQ-1000". */
  label: string;
  actions: MenuAction[];
  trigger?: ReactNode;
  align?: "start" | "end";
}

/** Overflow menu for secondary row actions. Only real actions are listed. */
export function Menu({ label, actions, trigger, align = "end" }: MenuProps) {
  if (actions.length === 0) return null;
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        {trigger ?? (
          <button
            type="button"
            aria-label={label}
            title={label}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center justify-center w-9 h-9 rounded-[var(--radius-control)] text-body hover:text-ink hover:bg-wash data-[state=open]:bg-wash cursor-pointer"
          >
            <MoreHorizontal className="w-[18px] h-[18px]" aria-hidden="true" />
          </button>
        )}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align={align}
          sideOffset={4}
          onClick={(e) => e.stopPropagation()}
          className="z-[var(--z-pop)] min-w-[200px] p-1 bg-panel border border-line rounded-[var(--radius-control)] shadow-[var(--shadow-overlay)]"
        >
          {actions.map(({ label: itemLabel, icon: Icon, onSelect, disabled, destructive }) => (
            <DropdownMenu.Item
              key={itemLabel}
              disabled={disabled}
              onSelect={onSelect}
              className={cn(
                "flex items-center gap-2.5 h-10 px-2.5 rounded-md text-small outline-none cursor-pointer select-none",
                "data-[highlighted]:bg-wash data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed",
                destructive ? "text-danger" : "text-ink"
              )}
            >
              {Icon && <Icon className="w-4 h-4 shrink-0 text-body" aria-hidden="true" />}
              {itemLabel}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
