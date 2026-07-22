type ProgressTone = "primary" | "success" | "warning" | "accent";

const toneClasses: Record<ProgressTone, string> = {
  primary: "bg-primary-600",
  success: "bg-success",
  warning: "bg-warning",
  accent: "bg-accent-500",
};

export function ProgressBar({
  value,
  max = 100,
  tone = "primary",
  size = "md",
  label,
  className = "",
}: {
  value: number;
  max?: number;
  tone?: ProgressTone;
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const height = size === "sm" ? "h-1.5" : size === "lg" ? "h-3.5" : "h-2.5";
  return (
    <div
      role="progressbar"
      aria-label={label ?? "Kemajuan"}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.round(value)}
      className={`overflow-hidden rounded-full bg-surface-sunken ${height} ${className}`}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-500 ease-out ${toneClasses[tone]}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
