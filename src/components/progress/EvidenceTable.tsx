import Link from "next/link";
import type { CombinedEvidenceRow } from "@/types/progress";
import { EvidenceBadge } from "./MovementBadge";
import { subjectDisplayName } from "@/lib/subjects";

function formatDelta(value: number | null): string {
  if (value === null) return "-";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}`;
}

function formatPercent(value: number | null): string {
  if (value === null) return "-";
  return `${value.toFixed(1)}%`;
}

export function EvidenceTable({
  rows,
  year,
}: {
  rows: CombinedEvidenceRow[];
  year: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-border-default bg-surface-card p-8 text-center shadow-raised">
        <p className="text-sm text-text-muted">
          Tiada data gabungan tersedia. Pastikan data UPSA, UASA dan PBD kedua-dua semester telah diisi.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border-default bg-surface-card shadow-raised">
      <table className="w-full min-w-[56rem] text-sm">
        <thead>
          <tr className="border-b border-border-default bg-surface-inset/50 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
            <th className="px-4 py-3">Kelas</th>
            <th className="px-4 py-3">Subjek</th>
            <th className="px-4 py-3">Bukti</th>
            <th className="px-4 py-3 text-right">Purata UPSA</th>
            <th className="px-4 py-3 text-right">Purata UASA</th>
            <th className="px-4 py-3 text-right">Perubahan</th>
            <th className="px-4 py-3 text-right">PBD Rendah S1→S2</th>
            <th className="px-4 py-3 text-right">PBD Tinggi S1→S2</th>
            <th className="px-4 py-3 text-right">Liputan</th>
            <th className="px-4 py-3">Pautan</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-default">
          {rows.map((row) => (
            <tr key={`${row.className}|${row.subjectCode}`} className="transition-colors hover:bg-surface-inset/40">
              <td className="whitespace-nowrap px-4 py-3 font-medium text-text-primary">{row.className}</td>
              <td className="whitespace-nowrap px-4 py-3 text-text-secondary">{subjectDisplayName(row.subjectCode)}</td>
              <td className="px-4 py-3"><EvidenceBadge label={row.label} /></td>
              <td className="px-4 py-3 text-right tabular-nums text-text-secondary">
                {formatPercent(row.exam?.upsaAveragePercent ?? null)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-text-secondary">
                {formatPercent(row.exam?.uasaAveragePercent ?? null)}
              </td>
              <td className={`px-4 py-3 text-right font-semibold tabular-nums ${
                (row.exam?.averageDelta ?? 0) < 0 ? "text-warning" : (row.exam?.averageDelta ?? 0) > 0 ? "text-success" : "text-text-secondary"
              }`}>
                {formatDelta(row.exam?.averageDelta ?? null)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-text-secondary">
                {row.pbd?.sem1 && row.pbd?.sem2
                  ? `${row.pbd.sem1.low.toFixed(0)}% → ${row.pbd.sem2.low.toFixed(0)}%`
                  : "-"}
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-text-secondary">
                {row.pbd?.sem1 && row.pbd?.sem2
                  ? `${row.pbd.sem1.high.toFixed(0)}% → ${row.pbd.sem2.high.toFixed(0)}%`
                  : "-"}
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-text-muted">
                {row.matchedPupilCount}/{row.totalPupilCount}
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1.5">
                  {(row.label === "declining" || row.label === "mixed") ? (
                    <>
                      <Link
                        href={`/insights?year=${year}&className=${encodeURIComponent(row.className)}&subject=${encodeURIComponent(row.subjectCode)}`}
                        className="text-xs font-semibold text-primary-700 underline transition-colors hover:text-primary-800"
                      >
                        Dapatan
                      </Link>
                      <Link
                        href={`/dialog-prestasi?year=${year}`}
                        className="text-xs font-semibold text-primary-700 underline transition-colors hover:text-primary-800"
                      >
                        DP
                      </Link>
                      <Link
                        href={`/assessments/${year}/uasa/classes`}
                        className="text-xs font-semibold text-primary-700 underline transition-colors hover:text-primary-800"
                      >
                        Analisis
                      </Link>
                      <Link
                        href={`/intervensi?year=${year}&className=${encodeURIComponent(row.className)}&subject=${encodeURIComponent(row.subjectCode)}`}
                        className="text-xs font-semibold text-primary-700 underline transition-colors hover:text-primary-800"
                      >
                        Intervensi
                      </Link>
                    </>
                  ) : null}
                  <Link
                    href={`/progress?year=${year}&classId=${encodeURIComponent(row.className)}&subject=${encodeURIComponent(row.subjectCode)}`}
                    className="text-xs font-semibold text-primary-700 underline transition-colors hover:text-primary-800"
                  >
                    Murid
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
