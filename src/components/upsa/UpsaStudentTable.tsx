"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { UpsaStudentResult } from "@/types/upsa";
import type { AssessmentPeriod } from "@/lib/config/periods";

export function UpsaStudentTable({ students, period }: { students: UpsaStudentResult[]; period?: AssessmentPeriod }) {
  const [query, setQuery] = useState("");
  const [missingOnly, setMissingOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"bil" | "average-desc" | "average-asc">("bil");
  const filtered = useMemo(
    () => {
      const matching = students.filter((student) => {
        const matchesQuery = student.name.toLowerCase().includes(query.toLowerCase());
        return matchesQuery && (!missingOnly || student.missingSubjects.length > 0);
      });
      return [...matching].sort((a, b) => {
        if (sortBy === "average-desc") return (b.average ?? -1) - (a.average ?? -1);
        if (sortBy === "average-asc") return (a.average ?? Number.POSITIVE_INFINITY) - (b.average ?? Number.POSITIVE_INFINITY);
        return Number(a.bil) - Number(b.bil);
      });
    },
    [students, query, missingOnly, sortBy],
  );
  const displayMark = (subject: UpsaStudentResult["subjects"][number]) => subject.status === "absent" ? "TH" : subject.mark ?? "-";
  const classSlipsPath = (className: string) =>
    period
      ? `/assessments/${period.year}/${period.assessment}/classes/${encodeURIComponent(className)}/slips`
      : `/upsa/classes/${encodeURIComponent(className)}/slips`;
  const studentPdfPath = (student: UpsaStudentResult) =>
    period
      ? `/api/assessments/${period.year}/${period.assessment}/slips/${encodeURIComponent(student.className)}/students/${encodeURIComponent(student.id)}/pdf`
      : `/api/upsa/slips/${encodeURIComponent(student.className)}/students/${encodeURIComponent(student.id)}/pdf`;

  return (
    <div className="overflow-hidden rounded-xl border border-border-default bg-surface-card shadow-card">
      <div className="flex flex-col gap-3 border-b border-border-default p-4 sm:flex-row sm:items-center sm:justify-between">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cari nama murid"
          className="w-full rounded-lg border border-border-strong bg-surface-card px-3 py-2 text-sm text-text-primary shadow-raised transition-[border-color,box-shadow] focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-primary-500/20 sm:max-w-xs"
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <input type="checkbox" checked={missingOnly} onChange={(event) => setMissingOnly(event.target.checked)} className="h-4 w-4 cursor-pointer rounded border-border-strong accent-[var(--primary-600)]" />
            Tunjuk markah hilang sahaja
          </label>
          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <span>Susun</span>
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)} className="rounded-lg border border-border-strong bg-surface-card px-3 py-2 text-sm text-text-primary shadow-raised focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-primary-500/20">
              <option value="bil">Bil asal</option>
              <option value="average-desc">Purata tertinggi</option>
              <option value="average-asc">Purata terendah</option>
            </select>
          </label>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[58rem] w-full text-sm">
          <thead>
            <tr>
              {["Bil", "Nama murid", "Markah dipaparkan", "Subjek diisi", "Jumlah diproses", "Purata", "Markah hilang", "TH"].map((heading) => (
                <th key={heading} className="whitespace-nowrap border-b border-border-default bg-surface-inset px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">{heading}</th>
              ))}
              <th className="whitespace-nowrap border-b border-border-default bg-surface-inset px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-muted">Tindakan</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((student) => (
              <tr key={student.id} className="border-b border-border-default align-top transition-colors last:border-b-0 hover:bg-surface-inset/60">
                <td className="px-4 py-3 tabular-nums text-text-disabled">{student.bil}</td>
                <td className="px-4 py-3 font-medium text-text-primary">{student.name}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {student.subjects.map((subject) => (
                      <span key={subject.subjectCode} className="rounded-md bg-surface-inset px-2 py-1 text-xs font-medium tabular-nums text-text-secondary">
                        {subject.subjectCode} {displayMark(subject)}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 tabular-nums">{student.validSubjectCount}</td>
                <td className="px-4 py-3 tabular-nums">{student.totalMarks ?? "-"}</td>
                <td className="px-4 py-3 tabular-nums">{student.average?.toFixed(1) ?? "-"}</td>
                <td className="px-4 py-3">
                  {student.missingSubjects.length ? (
                    <span className="font-medium text-warning-text">{student.missingSubjects.join(", ")}</span>
                  ) : (
                    <span className="font-medium text-success-text">Lengkap</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {student.absentSubjects.length ? (
                    <span className="font-medium text-info-text">{student.absentSubjects.join(", ")}</span>
                  ) : (
                    <span className="text-text-disabled">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <Link
                      href={`${classSlipsPath(student.className)}#${encodeURIComponent(student.id)}`}
                      className="rounded-lg border border-border-strong bg-surface-card px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-inset hover:text-text-primary"
                    >
                      Pratonton
                    </Link>
                    <a
                      href={studentPdfPath(student)}
                      className="inline-flex items-center justify-center rounded-lg border border-primary-700 bg-primary-700 px-3 py-2 text-sm font-semibold text-white shadow-raised transition-colors hover:bg-primary-800"
                    >
                      PDF
                    </a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
