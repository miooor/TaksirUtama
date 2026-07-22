import type { PupilMovement } from "@/types/progress";
import { MovementBadge } from "./MovementBadge";

function formatPercent(value: number | null): string {
  if (value === null) return "-";
  return `${value.toFixed(1)}%`;
}

function formatDelta(value: number | null): string {
  if (value === null) return "-";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}`;
}

export function PupilMovementTable({ movements }: { movements: PupilMovement[] }) {
  if (movements.length === 0) {
    return (
      <div className="rounded-xl border border-border-default bg-surface-card p-8 text-center shadow-raised">
        <p className="text-sm text-text-muted">
          Tiada murid yang sepadan antara UPSA dan UASA untuk paparan ini.
          Pastikan murid mempunyai ID pelajar yang stabil dalam kedua-dua pentaksiran.
        </p>
      </div>
    );
  }

  // Sort: declined first, then improved, then stable, then incomplete
  const directionOrder = { declined: 0, improved: 1, stable: 2, incomplete: 3 } as const;
  const sorted = [...movements].sort(
    (a, b) => directionOrder[a.direction] - directionOrder[b.direction] || (a.delta ?? 0) - (b.delta ?? 0),
  );

  return (
    <div className="overflow-x-auto rounded-xl border border-border-default bg-surface-card shadow-raised">
      <table className="w-full min-w-[48rem] text-sm">
        <thead>
          <tr className="border-b border-border-default bg-surface-inset/50 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
            <th className="px-4 py-3">Murid</th>
            <th className="px-4 py-3">Kelas</th>
            <th className="px-4 py-3">Subjek</th>
            <th className="px-4 py-3 text-right">UPSA %</th>
            <th className="px-4 py-3 text-right">UASA %</th>
            <th className="px-4 py-3 text-right">Perubahan</th>
            <th className="px-4 py-3">Arah</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-default">
          {sorted.map((m) => (
            <tr key={`${m.studentId}|${m.subjectCode}`} className="transition-colors hover:bg-surface-inset/40">
              <td className="px-4 py-3">
                <span className="font-medium text-text-primary">{m.displayName}</span>
                {m.previousClassName ? (
                  <span className="ml-2 text-xs text-text-muted">(dari {m.previousClassName})</span>
                ) : null}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-text-secondary">{m.className}</td>
              <td className="whitespace-nowrap px-4 py-3 text-text-secondary">{m.subjectCode}</td>
              <td className="px-4 py-3 text-right tabular-nums text-text-secondary">{formatPercent(m.upsaPercent)}</td>
              <td className="px-4 py-3 text-right tabular-nums text-text-secondary">{formatPercent(m.uasaPercent)}</td>
              <td className={`px-4 py-3 text-right font-semibold tabular-nums ${
                (m.delta ?? 0) < 0 ? "text-warning" : (m.delta ?? 0) > 0 ? "text-success" : "text-text-secondary"
              }`}>
                {formatDelta(m.delta)}
              </td>
              <td className="px-4 py-3"><MovementBadge direction={m.direction} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
