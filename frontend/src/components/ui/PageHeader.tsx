import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

/** The page's single h1 (30px) with its primary action on the right. */
export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
      <div className="min-w-0">
        <h1 className="text-page-title font-bold tracking-[-0.02em] text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-copy text-body">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
