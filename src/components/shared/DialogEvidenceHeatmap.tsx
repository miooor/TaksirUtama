type EvidenceCell = {
  label: string;
  value: number | null;
  display: string;
  tone: "high-good" | "low-good" | "attention" | "neutral";
};

function cellClass(cell: EvidenceCell) {
  if (cell.value === null || cell.tone === "neutral") return "bg-surface-inset text-text-secondary";
  if (cell.tone === "attention") {
    if (cell.value >= 90) return "bg-danger text-white";
    if (cell.value >= 45) return "bg-accent-300 text-accent-900";
    return "bg-success-surface text-success-text";
  }
  if (cell.tone === "low-good") {
    if (cell.value >= 30) return "bg-danger text-white";
    if (cell.value >= 15) return "bg-accent-300 text-accent-900";
    return "bg-success-surface text-success-text";
  }
  if (cell.value >= 75) return "bg-success text-white";
  if (cell.value >= 50) return "bg-accent-300 text-accent-900";
  return "bg-danger text-white";
}

export function DialogEvidenceHeatmap({
  title,
  description,
  rows,
}: {
  title: string;
  description: string;
  rows: Array<{ label: string; cells: EvidenceCell[] }>;
}) {
  const columns = rows[0]?.cells.map((cell) => cell.label) ?? [];

  return (
    <section className="rounded-xl border border-border-default bg-surface-card p-5 shadow-card">
      <h2 className="font-display text-lg font-semibold text-text-primary">{title}</h2>
      <p className="mt-1 text-sm text-text-muted">{description}</p>
      {rows.length === 0 ? <p className="mt-4 text-sm text-text-muted">Tiada data sepadan.</p> : null}
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-[44rem] border-separate border-spacing-1 text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-surface-card px-2 py-2 text-left font-medium text-text-muted">Kelas</th>
              {columns.map((column) => (
                <th key={column} className="px-2 py-2 text-center font-medium text-text-muted">{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <th className="sticky left-0 z-10 whitespace-nowrap bg-surface-card px-2 py-2 text-left font-medium text-text-primary">{row.label}</th>
                {row.cells.map((cell) => (
                  <td key={`${row.label}-${cell.label}`} className="px-1 py-1 text-center">
                    <span className={`inline-flex min-h-9 min-w-16 items-center justify-center rounded-md px-2 font-medium ${cellClass(cell)}`} title={`${cell.label}: ${cell.display}`}>
                      {cell.display}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
