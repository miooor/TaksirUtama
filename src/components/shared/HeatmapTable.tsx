import type { Language } from "@/lib/i18n";

type Cell = {
  value: number;
  label: string;
};

export function HeatmapTable({
  title,
  description,
  columns,
  rows,
  tone,
  language = "ms",
}: {
  title: string;
  description: string;
  columns: string[];
  rows: Array<{ label: string; cells: Cell[] }>;
  tone: "completion" | "attention";
  language?: Language;
}) {
  function cellClass(value: number) {
    if (tone === "completion") {
      if (value >= 100) return "bg-success text-white";
      if (value >= 75) return "bg-primary-500 text-white";
      if (value > 0) return "bg-accent-300 text-accent-900";
      return "bg-danger text-white";
    }
    if (value === 0) return "bg-success-surface text-success-text";
    if (value <= 2) return "bg-accent-200 text-accent-900";
    return "bg-danger text-white";
  }

  return (
    <section className="rounded-xl border border-border-default bg-surface-card p-5 shadow-card">
      <h2 className="font-display text-lg font-semibold text-text-primary">{title}</h2>
      <p className="mt-1 text-sm text-text-muted">{description}</p>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-[36rem] border-separate border-spacing-1 text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-surface-card px-2 py-2 text-left font-medium text-text-muted">{language === "en" ? "Class" : "Kelas"}</th>
              {columns.map((column) => (
                <th key={column} className="px-2 py-2 text-center font-medium text-text-muted">{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <th className="sticky left-0 z-10 whitespace-nowrap bg-surface-card px-2 py-2 text-left font-medium text-text-primary">{row.label}</th>
                {row.cells.map((cell, index) => (
                  <td key={`${row.label}-${columns[index]}`} className="px-1 py-1 text-center">
                    <span className={`inline-flex min-h-9 min-w-12 items-center justify-center rounded-md px-2 font-medium ${cellClass(cell.value)}`} title={cell.label}>
                      {tone === "completion" ? `${cell.value.toFixed(0)}%` : cell.value}
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
