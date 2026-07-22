import { AlertCircle, CheckCircle2, Info, TriangleAlert, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type AlertVariant = "info" | "success" | "warning" | "danger";

const variantConfig: Record<AlertVariant, { icon: LucideIcon; classes: string; iconClasses: string }> = {
  info: { icon: Info, classes: "border-info-border bg-info-surface text-info-text", iconClasses: "text-info" },
  success: { icon: CheckCircle2, classes: "border-success-border bg-success-surface text-success-text", iconClasses: "text-success" },
  warning: { icon: TriangleAlert, classes: "border-warning-border bg-warning-surface text-warning-text", iconClasses: "text-warning" },
  danger: { icon: AlertCircle, classes: "border-danger-border bg-danger-surface text-danger-text", iconClasses: "text-danger" },
};

export function Alert({
  variant = "info",
  title,
  children,
  className = "",
}: {
  variant?: AlertVariant;
  title?: string;
  children?: ReactNode;
  className?: string;
}) {
  const config = variantConfig[variant];
  const Icon = config.icon;
  return (
    <div role={variant === "danger" || variant === "warning" ? "alert" : "status"} className={`flex items-start gap-3 rounded-xl border p-4 ${config.classes} ${className}`}>
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${config.iconClasses}`} aria-hidden="true" />
      <div className="min-w-0 text-sm leading-5">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className={title ? "mt-1 opacity-90" : ""}>{children}</div> : null}
      </div>
    </div>
  );
}
