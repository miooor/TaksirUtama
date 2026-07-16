"use client";

import { useMemo, useState } from "react";
import { IssueBadge } from "@/components/shared/IssueBadge";
import type { PbdSubjectClassRecord } from "@/types/pbd";
import type { Language } from "@/lib/i18n";

export function PbdClassTable({ records, language = "ms" }: { records: PbdSubjectClassRecord[]; language?: Language }) {
  const [query, setQuery] = useState("");
  const [issuesOnly, setIssuesOnly] = useState(false);
  const filtered = useMemo(
    () => records.filter((record) => record.subjectCode.toLowerCase().includes(query.toLowerCase()) && (!issuesOnly || record.dataIssues.length > 0)),
    [records, query, issuesOnly],
  );
  const t =
    language === "en"
      ? {
          title: "Summary by subject",
          search: "Search subject",
          issuesOnly: "Issues only",
          subject: "Subject",
          dominant: "Dominant",
          notAssessed: "Not assessed",
          status: "Status",
        }
      : {
          title: "Ringkasan mengikut subjek",
          search: "Cari subjek",
          issuesOnly: "Isu sahaja",
          subject: "Subjek",
          dominant: "Dominan",
          notAssessed: "Belum ditaksir",
          status: "Status",
        };
  return (
    <section className="mt-6 overflow-hidden rounded-lg border bg-white">
      <div className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold">{t.title}</h2>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.search} className="rounded-md border px-3 py-2 text-sm" />
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={issuesOnly} onChange={(event) => setIssuesOnly(event.target.checked)} />
            {t.issuesOnly}
          </label>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[38rem] w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600"><tr><th className="px-4 py-3">{t.subject}</th><th className="px-4 py-3">{t.dominant}</th><th className="px-4 py-3">TP1+TP2</th><th className="px-4 py-3">TP5+TP6</th><th className="px-4 py-3">{t.notAssessed}</th><th className="px-4 py-3">{t.status}</th></tr></thead>
          <tbody>
            {filtered.map((record) => (
              <tr key={record.subjectCode} className="border-t hover:bg-slate-50/70">
                <td className="px-4 py-3 font-medium">{record.subjectCode}</td>
                <td className="px-4 py-3">{record.dominantTpBand ?? "-"}</td>
                <td className="px-4 py-3">{record.lowAchievementPercentage.toFixed(1)}%</td>
                <td className="px-4 py-3">{record.highAchievementPercentage.toFixed(1)}%</td>
                <td className="px-4 py-3">{record.notAssessedCount}</td>
                <td className="px-4 py-3"><IssueBadge issues={record.dataIssues} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
