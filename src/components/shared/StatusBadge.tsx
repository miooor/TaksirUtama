export function StatusBadge({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "warning" | "success";
}) {
  const toneClass =
    tone === "warning"
      ? "border-warning-border bg-warning-surface text-warning-text"
      : tone === "success"
        ? "border-success-border bg-success-surface text-success-text"
        : "border-border-default bg-surface-inset text-text-secondary";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${toneClass}`}>
      {children}
    </span>
  );
}
