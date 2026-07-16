type EvidenceCell = {
  label: string;
  value: number | null;
  display: string;
  tone: "high-good" | "low-good" | "attention" | "neutral";
};

function cellClass(cell: EvidenceCell) {
  if (cell.value === null || cell.tone === "neutral") return "bg-slate-100 text-slate-600";
  if (cell.tone === "attention") {
    if (cell.value >= 90) return "bg-rose-600 text-white";
    if (cell.value >= 45) return "bg-amber-300 text-slate-900";
    return "bg-emerald-100 text-emerald-800";
  }
  if (cell.tone === "low-good") {
    if (cell.value >= 30) return "bg-rose-600 text-white";
    if (cell.value >= 15) return "bg-amber-300 text-slate-900";
    return "bg-emerald-100 text-emerald-800";
  }
  if (cell.value >= 75) return "bg-emerald-600 text-white";
  if (cell.value >= 50) return "bg-amber-300 text-slate-900";
  return "bg-rose-600 text-white";
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
    <section className="rounded-lg border bg-white p-5">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-slate-600">{description}</p>
      {rows.length === 0 ? <p className="mt-4 text-sm text-slate-600">Tiada data sepadan.</p> : null}
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-[44rem] border-separate border-spacing-1 text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-white px-2 py-2 text-left font-medium text-slate-500">Kelas</th>
              {columns.map((column) => (
                <th key={column} className="px-2 py-2 text-center font-medium text-slate-500">{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <th className="sticky left-0 z-10 whitespace-nowrap bg-white px-2 py-2 text-left font-medium">{row.label}</th>
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
