export function StatusBadge({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "warning" | "success";
}) {
  const toneClass =
    tone === "warning"
      ? "text-amber-700"
      : tone === "success"
        ? "text-emerald-700"
        : "text-stone-700";
  return <span className={`text-sm font-medium ${toneClass}`}>{children}</span>;
}
