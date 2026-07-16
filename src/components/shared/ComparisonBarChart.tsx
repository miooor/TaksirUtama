type Series = {
  key: string;
  label: string;
  colorClassName: string;
};

type Row = {
  label: string;
  values: Record<string, number>;
  valueLabels?: Record<string, string>;
};

export function ComparisonBarChart({
  title,
  rows,
  series,
  emptyMessage = "No data available.",
  suffix = "%",
}: {
  title: string;
  rows: Row[];
  series: Series[];
  emptyMessage?: string;
  suffix?: string;
}) {
  const max = Math.max(...rows.flatMap((row) => series.map((item) => row.values[item.key] ?? 0)), 1);

  return (
    <section className="rounded-lg border bg-white p-5">
      <h2 className="text-lg font-semibold">{title}</h2>
      {rows.length === 0 ? <p className="mt-4 text-sm text-slate-600">{emptyMessage}</p> : null}
      <div className="mt-4 space-y-4">
        {rows.map((row) => (
          <div key={row.label}>
            <p className="mb-2 text-sm font-medium">{row.label}</p>
            <div className="space-y-2">
              {series.map((item) => {
                const value = row.values[item.key] ?? 0;
                return (
                  <div key={item.key} className="grid grid-cols-[5.5rem_1fr_auto] items-center gap-2 text-xs sm:text-sm">
                    <span className="text-slate-500">{item.label}</span>
                    <div className="h-2 rounded-full bg-stone-100">
                      <div className={`h-2 rounded-full ${item.colorClassName}`} style={{ width: `${(value / max) * 100}%` }} />
                    </div>
                    <span className="tabular-nums text-slate-600">{row.valueLabels?.[item.key] ?? `${value.toFixed(1)}${suffix}`}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
