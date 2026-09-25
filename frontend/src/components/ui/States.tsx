import type { ReactNode } from "react";
import { CircleAlert, type LucideIcon } from "lucide-react";
import { Button } from "./Button";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  message?: string;
  action?: ReactNode;
}

/** Says why there is nothing here and offers the one action that fills it. */
export function EmptyState({ icon: Icon, title, message, action }: EmptyStateProps) {
  return (
    <div role="status" className="flex flex-col items-center text-center px-6 py-12">
      {Icon && <Icon className="w-6 h-6 text-subtle" strokeWidth={1.75} aria-hidden="true" />}
      <p className="mt-3 text-copy font-semibold text-ink">{title}</p>
      {message && <p className="mt-1 max-w-[48ch] text-meta text-body">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

interface ErrorStateProps {
  title: string;
  message?: string;
  onRetry?: () => void;
  compact?: boolean;
}

/** What failed and how to recover. */
export function ErrorState({ title, message, onRetry, compact = false }: ErrorStateProps) {
  return (
    <div role="alert" className={compact ? "flex items-start gap-2 p-4" : "flex flex-col items-center text-center px-6 py-12"}>
      <CircleAlert className="w-5 h-5 shrink-0 text-danger" strokeWidth={2} aria-hidden="true" />
      <div className={compact ? "min-w-0" : "mt-3"}>
        <p className="text-copy font-semibold text-ink">{title}</p>
        <p className="mt-1 max-w-[52ch] text-meta text-body">
          {message ?? "The maintenance service isn't responding."} {onRetry ? "Try again in a moment." : ""}
        </p>
        {onRetry && (
          <Button size="sm" className="mt-3" onClick={onRetry}>
            Try again
          </Button>
        )}
      </div>
    </div>
  );
}

export function Skeleton({ className }: { className: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}
