export function MetricCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  tone?: "default" | "warning" | "success";
}) {
  const accentClass =
    tone === "warning"
      ? "border-l-warning"
      : tone === "success"
        ? "border-l-success"
        : "border-l-primary-500";

  return (
    <div className={`rounded-xl border border-border-default border-l-4 bg-surface-card p-4 shadow-raised ${accentClass}`}>
      <p className="text-sm font-medium text-text-muted">{label}</p>
      <p className="mt-2 font-display text-2xl font-bold tabular-nums text-text-primary">{value}</p>
    </div>
  );
}
