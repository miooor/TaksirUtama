export function SimpleBarChart({
  title,
  data,
}: {
  title: string;
  data: Array<{ label: string; value: number }>;
}) {
  const max = Math.max(...data.map((item) => item.value), 1);
  return (
    <section className="rounded-xl border border-border-default bg-surface-card p-5 shadow-card">
      <h2 className="font-display text-lg font-semibold text-text-primary">{title}</h2>
      <div className="mt-4 space-y-3">
        {data.map((item) => (
          <div key={item.label}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-text-secondary">{item.label}</span>
              <span className="tabular-nums text-text-muted">{item.value}</span>
            </div>
            <div className="h-2 rounded-full bg-surface-sunken">
              <div className="h-2 rounded-full bg-primary-600" style={{ width: `${(item.value / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
