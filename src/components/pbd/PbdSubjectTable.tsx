"use client";

import { useMemo, useState } from "react";
import { IssueBadge } from "@/components/shared/IssueBadge";
import type { PbdSubjectClassRecord } from "@/types/pbd";
import type { Language } from "@/lib/i18n";

const bands = ["TP1", "TP2", "TP3", "TP4", "TP5", "TP6"] as const;

export function PbdSubjectTable({ records, language = "ms" }: { records: PbdSubjectClassRecord[]; language?: Language }) {
  const [query, setQuery] = useState("");
  const [issuesOnly, setIssuesOnly] = useState(false);
  const filtered = useMemo(
    () =>
      records.filter((record) => {
        const matchesQuery = record.className.toLowerCase().includes(query.toLowerCase());
        return matchesQuery && (!issuesOnly || record.dataIssues.length > 0);
      }),
    [records, query, issuesOnly],
  );
  const t =
    language === "en"
      ? {
          title: "TP distribution by class",
          search: "Search class",
          issuesOnly: "Issues only",
          class: "Class",
          notAssessed: "Not assessed",
          status: "Status",
        }
      : {
          title: "Taburan TP mengikut kelas",
          search: "Cari kelas",
          issuesOnly: "Isu sahaja",
          class: "Kelas",
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
        <table className="min-w-[46rem] w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-3">{t.class}</th>
              {bands.map((band) => <th key={band} className="px-4 py-3">{band}</th>)}
              <th className="px-4 py-3">TP1+TP2</th>
              <th className="px-4 py-3">TP5+TP6</th>
              <th className="px-4 py-3">{t.notAssessed}</th>
              <th className="px-4 py-3">{t.status}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((record) => (
              <tr key={record.className} className="border-t hover:bg-slate-50/70">
                <td className="px-4 py-3 font-medium">{record.className}</td>
                {bands.map((band) => <td key={band} className="px-4 py-3">{record.tpCounts[band]}</td>)}
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
