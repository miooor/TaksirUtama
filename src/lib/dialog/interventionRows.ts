import { interventionPupilKey, summarizeInterventionPupils } from "@/lib/pbd/intervention";
import { classifyInterventionTheme, nextActionForInterventionTheme, ownerForInterventionTheme } from "@/lib/dialog/interventionTheme";
import { deriveOverdue, effectiveStatus } from "@/lib/pbd/interventionLifecycle";
import type { DialogInterventionRow } from "@/types/dialog";
import type { PbdInterventionEntry } from "@/types/intervention";

export function buildDialogInterventionRows(entries: PbdInterventionEntry[]): DialogInterventionRow[] {
  const pupils = summarizeInterventionPupils(entries);
  const pupilByKey = new Map(pupils.map((pupil) => [pupil.key, pupil]));

  return entries
    .map((entry): DialogInterventionRow | null => {
      const key = interventionPupilKey(entry);
      const pupil = pupilByKey.get(key);
      if (!pupil) return null;
      const theme = classifyInterventionTheme(entry.problem, entry.intervention);
      return {
        studentName: entry.studentName,
        className: entry.className,
        year: entry.year,
        subjectCode: entry.subjectCode,
        tp: entry.tp,
        problem: entry.problem,
        intervention: entry.intervention,
        theme,
        owner: ownerForInterventionTheme(theme),
        nextAction: nextActionForInterventionTheme(theme),
        priorityLabel: pupil.severity === "urgent" ? "Segera" : pupil.severity === "coordinated" ? "Selaras" : "Pantau",
        subjectCount: pupil.subjectCount,
        repeatedRisk: pupil.subjectCount >= 2,
        pupil,
        entry,
      };
    })
    .filter((row): row is DialogInterventionRow => row !== null)
    .sort((a, b) =>
      Number(b.repeatedRisk) - Number(a.repeatedRisk) ||
      a.tp - b.tp ||
      b.subjectCount - a.subjectCount ||
      a.className.localeCompare(b.className, "ms") ||
      a.studentName.localeCompare(b.studentName, "ms") ||
      a.subjectCode.localeCompare(b.subjectCode, "ms"),
    );
}

export function buildDialogInterventionCsvRows(rows: DialogInterventionRow[]) {
  return rows.map((row) => ({
    Tahun: row.year,
    Kelas: row.className,
    Murid: row.studentName,
    Subjek: row.subjectCode,
    TP: `TP${row.tp}`,
    Tema: row.theme,
    Pemilik: row.owner,
    Keutamaan: row.priorityLabel,
    "Risiko Berulang": row.repeatedRisk ? "Ya" : "Tidak",
    "Bil Subjek": row.subjectCount,
    Masalah: row.problem,
    Intervensi: row.intervention,
    "Tindakan Seterusnya": row.nextAction,
    Status: row.entry ? effectiveStatusLabel(row.entry) : "Dirancang",
    "Tarikh Semakan": row.entry?.reviewDueOn ?? "",
    Lewat: row.entry ? (deriveOverdue(row.entry) ? "Ya" : "Tidak") : "Tidak",
    "Tarikh Semakan Terakhir": row.entry?.reviewedOn ?? "",
    "Nota Susulan": row.entry?.followUpNote ?? "",
  }));
}

const STATUS_LABELS: Record<string, string> = {
  planned: "Dirancang",
  in_progress: "Berjalan",
  needs_review: "Perlu semakan",
  completed: "Selesai",
};

function effectiveStatusLabel(entry: PbdInterventionEntry): string {
  return STATUS_LABELS[effectiveStatus(entry)] ?? "Dirancang";
}
