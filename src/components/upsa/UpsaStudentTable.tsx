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
    <div className="overflow-hidden rounded-lg border bg-white">
      <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cari nama murid"
          className="w-full rounded-md border px-3 py-2 text-sm sm:max-w-xs"
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={missingOnly} onChange={(event) => setMissingOnly(event.target.checked)} />
            Tunjuk markah hilang sahaja
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <span>Susun</span>
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)} className="rounded-md border bg-white px-3 py-2">
              <option value="bil">Bil asal</option>
              <option value="average-desc">Purata tertinggi</option>
              <option value="average-asc">Purata terendah</option>
            </select>
          </label>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[58rem] w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-3">Bil</th>
              <th className="px-4 py-3">Nama murid</th>
              <th className="px-4 py-3">Markah dipaparkan</th>
              <th className="px-4 py-3">Subjek diisi</th>
              <th className="px-4 py-3">Jumlah diproses</th>
              <th className="px-4 py-3">Purata</th>
              <th className="px-4 py-3">Markah hilang</th>
              <th className="px-4 py-3">TH</th>
              <th className="px-4 py-3 text-right">Tindakan</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((student) => (
              <tr key={student.id} className="border-t align-top hover:bg-slate-50/70">
                <td className="px-4 py-3 text-slate-500">{student.bil}</td>
                <td className="px-4 py-3 font-medium">{student.name}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {student.subjects.map((subject) => (
                      <span key={subject.subjectCode} className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700">
                        {subject.subjectCode} {displayMark(subject)}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">{student.validSubjectCount}</td>
                <td className="px-4 py-3">{student.totalMarks ?? "-"}</td>
                <td className="px-4 py-3">{student.average?.toFixed(1) ?? "-"}</td>
                <td className="px-4 py-3">
                  {student.missingSubjects.length ? (
                    <span className="text-amber-700">{student.missingSubjects.join(", ")}</span>
                  ) : (
                    <span className="text-emerald-700">Lengkap</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {student.absentSubjects.length ? (
                    <span className="text-sky-700">{student.absentSubjects.join(", ")}</span>
                  ) : (
                    <span className="text-slate-500">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <Link
                      href={`${classSlipsPath(student.className)}#${encodeURIComponent(student.id)}`}
                      className="rounded-md border px-3 py-2"
                    >
                      Pratonton
                    </Link>
                    <a
                      href={studentPdfPath(student)}
                      className="action-accent"
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
