import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = "",
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center rounded-xl border border-border-default bg-surface-card px-6 py-12 text-center shadow-card ${className}`}>
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <h2 className="mt-4 font-display text-lg font-semibold text-text-primary">{title}</h2>
      {description ? <p className="mt-2 max-w-md text-sm leading-6 text-text-muted">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
