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
    <section className="mt-6 overflow-hidden rounded-xl border border-border-default bg-surface-card shadow-card">
      <div className="flex flex-col gap-3 border-b border-border-default px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-display text-lg font-semibold text-text-primary">{t.title}</h2>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.search} className="rounded-lg border border-border-strong bg-surface-card px-3 py-2 text-sm text-text-primary shadow-raised transition-[border-color,box-shadow] focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <input type="checkbox" checked={issuesOnly} onChange={(event) => setIssuesOnly(event.target.checked)} className="h-4 w-4 cursor-pointer rounded border-border-strong accent-[var(--primary-600)]" />
            {t.issuesOnly}
          </label>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[46rem] w-full text-sm">
          <thead>
            <tr>
              <th className="border-b border-border-default bg-surface-inset px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">{t.class}</th>
              {bands.map((band) => <th key={band} className="border-b border-border-default bg-surface-inset px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">{band}</th>)}
              <th className="border-b border-border-default bg-surface-inset px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">TP1+TP2</th>
              <th className="border-b border-border-default bg-surface-inset px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">TP5+TP6</th>
              <th className="border-b border-border-default bg-surface-inset px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">{t.notAssessed}</th>
              <th className="border-b border-border-default bg-surface-inset px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">{t.status}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((record) => (
              <tr key={record.className} className="border-b border-border-default transition-colors last:border-b-0 hover:bg-surface-inset/60">
                <td className="px-4 py-3 font-medium text-text-primary">{record.className}</td>
                {bands.map((band) => <td key={band} className="px-4 py-3 tabular-nums text-text-secondary">{record.tpCounts[band]}</td>)}
                <td className="px-4 py-3 tabular-nums text-text-secondary">{record.lowAchievementPercentage.toFixed(1)}%</td>
                <td className="px-4 py-3 tabular-nums text-text-secondary">{record.highAchievementPercentage.toFixed(1)}%</td>
                <td className="px-4 py-3 tabular-nums text-text-secondary">{record.notAssessedCount}</td>
                <td className="px-4 py-3"><IssueBadge issues={record.dataIssues} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
