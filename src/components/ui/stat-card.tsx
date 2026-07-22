import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type StatTone = "default" | "primary" | "success" | "warning" | "danger" | "accent";

const toneConfig: Record<StatTone, { icon: string; value: string }> = {
  default: { icon: "bg-surface-inset text-text-muted", value: "text-text-primary" },
  primary: { icon: "bg-primary-50 text-primary-600", value: "text-primary-700" },
  success: { icon: "bg-success-surface text-success", value: "text-success-text" },
  warning: { icon: "bg-warning-surface text-warning", value: "text-warning-text" },
  danger: { icon: "bg-danger-surface text-danger", value: "text-danger-text" },
  accent: { icon: "bg-accent-50 text-accent-600", value: "text-accent-700" },
};

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "default",
  hint,
  className = "",
}: {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  tone?: StatTone;
  hint?: string;
  className?: string;
}) {
  const config = toneConfig[tone];
  return (
    <div className={`rounded-xl border border-border-default bg-surface-card p-4 shadow-raised ${className}`}>
      <div className="flex items-center gap-3">
        {Icon ? (
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${config.icon}`}>
            <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
          </span>
        ) : null}
        <div className="min-w-0">
          <p className={`font-display text-2xl font-bold leading-7 tabular-nums ${config.value}`}>{value}</p>
        </div>
      </div>
      <p className="mt-2 truncate text-sm font-medium text-text-secondary">{label}</p>
      {hint ? <p className="mt-0.5 text-xs text-text-muted">{hint}</p> : null}
    </div>
  );
}
