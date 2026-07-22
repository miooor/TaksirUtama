type Segment = {
  key: string;
  label: string;
  value: number;
  colorClassName: string;
};

type Row = {
  label: string;
  segments: Segment[];
};

export function StackedBarChart({
  title,
  rows,
  valueLabel = "Jumlah",
}: {
  title: string;
  rows: Row[];
  valueLabel?: string;
}) {
  return (
    <section className="rounded-xl border border-border-default bg-surface-card p-5 shadow-card">
      <h2 className="font-display text-lg font-semibold text-text-primary">{title}</h2>
      <div className="mt-4 space-y-4">
        {rows.map((row) => {
          const total = row.segments.reduce((sum, segment) => sum + segment.value, 0);
          return (
            <div key={row.label}>
              <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-text-primary">{row.label}</span>
                <span className="tabular-nums text-text-muted">{valueLabel}: {total}</span>
              </div>
              <div className="flex h-3 overflow-hidden rounded-full bg-surface-sunken">
                {row.segments.map((segment) => (
                  <span
                    key={segment.key}
                    className={segment.colorClassName}
                    style={{ width: total ? `${(segment.value / total) * 100}%` : "0%" }}
                    title={`${segment.label}: ${segment.value}`}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {rows[0] ? (
        <div className="mt-5 flex flex-wrap gap-3 text-xs text-text-secondary">
          {rows[0].segments.map((segment) => (
            <span key={segment.key} className="inline-flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-full ${segment.colorClassName}`} />
              {segment.label}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}
