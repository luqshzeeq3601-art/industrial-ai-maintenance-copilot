import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";

/** Flat surface on a 1px border (spec: minimal or no shadow). */
export function Card({ className, children, ...rest }: HTMLAttributes<HTMLElement> & { children: ReactNode }) {
  return (
    <section className={cn("bg-panel border border-line rounded-[var(--radius-card)]", className)} {...rest}>
      {children}
    </section>
  );
}

interface CardHeaderProps {
  title: ReactNode;
  /** Heading id so the card can be labelled by it. */
  id?: string;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
  as?: "h2" | "h3";
}

export function CardHeader({ title, id, subtitle, action, className, as: Heading = "h2" }: CardHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-3 px-5 pt-4 pb-3", className)}>
      <div className="min-w-0">
        <Heading id={id} className="text-section font-semibold text-ink">
          {title}
        </Heading>
        {subtitle && <p className="mt-0.5 text-meta text-muted">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0 flex items-center gap-2">{action}</div>}
    </div>
  );
}
