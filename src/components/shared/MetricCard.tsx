export function MetricCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  tone?: "default" | "warning" | "success";
}) {
  const toneClass =
    tone === "warning"
      ? "border-amber-200 bg-white"
      : tone === "success"
        ? "border-emerald-200 bg-white"
        : "bg-white";

  return (
    <div className={`rounded-lg border p-4 ${toneClass}`}>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}
