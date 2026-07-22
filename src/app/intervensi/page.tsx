import Link from "next/link";
import { AlertTriangle, Download, HeartHandshake } from "lucide-react";
import { AppShell } from "@/components/shared/AppShell";
import { MetricCard } from "@/components/shared/MetricCard";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { calculateInterventionDashboardAnalysis } from "@/lib/pbd/intervention";
import { getAllPbdInterventions } from "@/lib/pbd/data";
import { buildDialogInterventionRows } from "@/lib/dialog/interventionRows";
import { requireSchoolContext } from "@/lib/auth";
import { getLanguage, text } from "@/lib/i18n";
import { interventionPupilKey } from "@/lib/pbd/intervention";
import { resolveInterventionQueryContext } from "@/lib/pbd/interventionContext";

type SearchParams = {
  year?: string;
  semester?: string;
  level?: string;
  classId?: string;
  subjectId?: string;
  class?: string;
  className?: string;
  subject?: string;
};

export default async function InterventionPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const language = await getLanguage();
  const school = await requireSchoolContext();
  const params = await searchParams;
  const { year, semester, level, period } = resolveInterventionQueryContext(school, params);
  const subject = params.subject;
  const className = params.className ?? params.class;
  const { entries, issues } = await getAllPbdInterventions(school, period);

  const years = [...new Set(entries.map((entry) => entry.year))].sort((a, b) => a - b);
  const classes = [...new Set(entries.map((entry) => entry.className))].sort((a, b) => a.localeCompare(b, "ms"));
  const subjects = [...new Set(entries.map((entry) => entry.subjectCode))].sort((a, b) => a.localeCompare(b, "ms"));

  const filteredEntries = entries.filter((entry) => {
    if (level && entry.year !== level) return false;
    if (params.classId ? entry.classId !== params.classId : className && entry.className !== className) return false;
    if (params.subjectId ? entry.subjectId !== params.subjectId : subject && entry.subjectCode !== subject) return false;
    return true;
  });
  const analysis = calculateInterventionDashboardAnalysis(filteredEntries);
  const dialogRows = buildDialogInterventionRows(filteredEntries);
  const dialogRowByEntry = new Map(dialogRows.map((row) => [`${row.pupil.key}|${row.subjectCode}`, row]));
  const themes = [...new Set(dialogRows.map((row) => row.theme))].sort((a, b) => a.localeCompare(b, "ms"));
  const owners = [...new Set(dialogRows.map((row) => row.owner))].sort((a, b) => a.localeCompare(b, "ms"));
  const csvParams = new URLSearchParams();
  csvParams.set("year", year);
  csvParams.set("semester", semester);
  if (level) csvParams.set("level", String(level));
  if (params.classId) csvParams.set("classId", params.classId);
  if (params.subjectId) csvParams.set("subjectId", params.subjectId);
  if (className) csvParams.set("className", className);
  if (subject) csvParams.set("subject", subject);
  const csvHref = `/api/intervensi/csv${csvParams.size ? `?${csvParams.toString()}` : ""}`;

  return (
    <AppShell>
      <PageHeader
        eyebrow={text(language, { ms: "INTERVENSI", en: "INTERVENTION" })}
        title={text(language, {
          ms: "Murid yang memerlukan pengukuhan merentas subjek",
          en: "Pupils needing reinforcement across subjects",
        })}
        description={`Semester ${semester} · ${year} · ${text(language, { ms: "Kenal pasti murid berulang merentas subjek dan utamakan tindakan bersama.", en: "Identify pupils repeated across subjects and prioritize coordinated action." })}`}
        icon={HeartHandshake}
        actions={
          <><Link href={`/pbd/interventions/entry?year=${year}&semester=${semester}`} className="inline-flex items-center justify-center gap-2 rounded-lg border border-border-strong bg-surface-card px-3.5 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-inset hover:text-text-primary">Isi Intervensi</Link><Link href={csvHref} className="inline-flex items-center gap-2 rounded-lg border border-primary-700 bg-primary-700 px-3.5 py-2 text-sm font-semibold text-white shadow-raised transition-colors hover:bg-primary-800"><Download className="h-4 w-4" />CSV</Link></>
        }
      />

      <form className="mt-6 grid gap-3 rounded-xl border border-border-default bg-surface-card p-4 shadow-card md:grid-cols-[1fr_1fr_1fr_auto]">
        <label className="grid gap-1 text-sm">
          <span className="text-text-muted">{text(language, { ms: "Tahun", en: "Year" })}</span>
          <input type="hidden" name="year" value={year} /><input type="hidden" name="semester" value={semester} />
          <select name="level" defaultValue={level ?? ""} className="rounded-lg border border-border-strong bg-surface-card px-3 py-2 text-sm text-text-primary shadow-raised focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-primary-500/20">
            <option value="">{text(language, { ms: "Semua tahun", en: "All years" })}</option>
            {years.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-text-muted">{text(language, { ms: "Kelas", en: "Class" })}</span>
          <select name="classId" defaultValue={params.classId ?? className ?? ""} className="rounded-lg border border-border-strong bg-surface-card px-3 py-2 text-sm text-text-primary shadow-raised focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-primary-500/20">
            <option value="">{text(language, { ms: "Semua kelas", en: "All classes" })}</option>
            {classes.map((item) => { const id = entries.find((entry) => entry.className === item)?.classId; return <option key={item} value={id ?? item}>{item}</option>; })}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-text-muted">{text(language, { ms: "Subjek", en: "Subject" })}</span>
          <select name="subjectId" defaultValue={params.subjectId ?? subject ?? ""} className="rounded-lg border border-border-strong bg-surface-card px-3 py-2 text-sm text-text-primary shadow-raised focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-primary-500/20">
            <option value="">{text(language, { ms: "Semua subjek", en: "All subjects" })}</option>
            {subjects.map((item) => { const id = entries.find((entry) => entry.subjectCode === item)?.subjectId; return <option key={item} value={id ?? item}>{item}</option>; })}
          </select>
        </label>
        <div className="flex items-end gap-2">
          <button className="inline-flex items-center justify-center rounded-lg border border-primary-700 bg-primary-700 px-4 py-2 text-sm font-semibold text-white shadow-raised transition-colors hover:bg-primary-800 w-full md:w-auto">{text(language, { ms: "Tapis", en: "Filter" })}</button>
          {(level || params.classId || className || params.subjectId || subject) ? (
            <Link href={`/intervensi?year=${year}&semester=${semester}`} className="rounded-lg border border-border-strong bg-surface-card px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-inset">
              {text(language, { ms: "Reset", en: "Reset" })}
            </Link>
          ) : null}
        </div>
      </form>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <MetricCard label={text(language, { ms: "Entri intervensi", en: "Intervention entries" })} value={analysis.totalEntries} />
        <MetricCard label={text(language, { ms: "Murid unik", en: "Unique pupils" })} value={analysis.uniquePupils} />
        <MetricCard
          label={text(language, { ms: "Murid segera", en: "Urgent pupils" })}
          value={analysis.urgentPupils}
          tone={analysis.urgentPupils ? "warning" : "default"}
        />
        <MetricCard
          label={text(language, { ms: "Keutamaan tinggi", en: "High priority" })}
          value={analysis.highPriorityPupils}
          tone={analysis.highPriorityPupils ? "warning" : "default"}
        />
        <MetricCard label={text(language, { ms: "Subjek berentri", en: "Subjects with entries" })} value={analysis.subjectsWithEntries} />
        <MetricCard
          label={text(language, { ms: "Baris perlu semakan", en: "Rows needing review" })}
          value={issues.length}
          tone={issues.length ? "warning" : "success"}
        />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-4">
        <SummaryPanel
          title="Tema isu utama"
          rows={themes.slice(0, 5).map((theme) => ({
            label: theme,
            value: `${dialogRows.filter((row) => row.theme === theme).length}`,
          }))}
          empty="Tiada tema isu."
        />
        <SummaryPanel
          title="Pemilik dicadangkan"
          rows={owners.map((owner) => ({
            label: owner,
            value: `${dialogRows.filter((row) => row.owner === owner).length}`,
          }))}
          empty="Tiada pemilik."
        />
        <SummaryPanel
          title="Murid sasaran segera"
          rows={dialogRows.filter((row) => row.priorityLabel === "Segera").slice(0, 5).map((row) => ({
            label: row.studentName,
            value: `${row.className} / ${row.subjectCode}`,
          }))}
          empty="Tiada murid segera."
        />
        <SummaryPanel
          title="Tindakan minggu ini"
          rows={[...new Set(dialogRows.map((row) => row.nextAction))].slice(0, 5).map((action) => ({
            label: action,
            value: `${dialogRows.filter((row) => row.nextAction === action).length}`,
          }))}
          empty="Tiada tindakan dicadangkan."
        />
      </div>

      {issues.length ? (
        <section className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-700" />
            <div>
              <h2 className="font-semibold text-amber-900">
                {text(language, { ms: "Semakan data diperlukan", en: "Data review needed" })}
              </h2>
              <p className="mt-1 text-sm text-amber-800">
                {text(language, {
                  ms: `${issues.length} baris tidak lengkap atau tidak sah tidak dimasukkan dalam analisis.`,
                  en: `${issues.length} incomplete or invalid rows were excluded from the analysis.`,
                })}
              </p>
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-medium text-amber-900">
                  {text(language, { ms: "Log ralat penuh", en: "Full error log" })}
                </summary>
                <div className="mt-3 overflow-x-auto rounded-md border border-amber-200 bg-white/70">
                  <table className="min-w-[32rem] w-full text-sm">
                    <thead className="bg-amber-100/70 text-left text-amber-950">
                      <tr>
                        <th className="px-4 py-3">{text(language, { ms: "Subjek", en: "Subject" })}</th>
                        <th className="px-4 py-3">{text(language, { ms: "Baris", en: "Row" })}</th>
                        <th className="px-4 py-3">{text(language, { ms: "Sebab", en: "Reason" })}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {issues.map((item) => (
                        <tr key={`${item.subjectCode}-${item.rowNumber}-${item.reason}`} className="border-t border-amber-100">
                          <td className="px-4 py-3 font-medium">{item.subjectCode}</td>
                          <td className="px-4 py-3">{item.rowNumber}</td>
                          <td className="px-4 py-3">{item.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </div>
          </div>
        </section>
      ) : null}

      <section className="mt-6 overflow-hidden rounded-xl border border-border-default bg-surface-card shadow-card">
        <div className="border-b border-border-default p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-primary-600">
                {text(language, { ms: "Paparan risiko murid", en: "Pupil risk view" })}
              </p>
              <h2 className="mt-1 font-display text-lg font-semibold text-text-primary">
                {text(language, { ms: "Keutamaan pengukuhan", en: "Reinforcement priority" })}
              </h2>
            </div>
            <div className="flex gap-2">
              <StatusBadge tone="warning">TP1 {analysis.tp1Entries}</StatusBadge>
              <StatusBadge>TP2 {analysis.tp2Entries}</StatusBadge>
            </div>
          </div>
        </div>

        {analysis.pupils.length ? (
          <div className="divide-y divide-border-default">
            {analysis.pupils.map((pupil) => (
              <details key={pupil.key} className="group">
                <summary className="grid cursor-pointer list-none gap-3 px-5 py-4 transition-colors hover:bg-surface-inset/50 md:grid-cols-[minmax(0,1.4fr)_0.8fr_0.7fr_1fr_0.5fr_0.9fr_0.9fr] md:items-center">
                  <span className="font-medium text-text-primary">{pupil.studentName}</span>
                  <span className="text-sm text-text-muted">{pupil.className}</span>
                  <span className="text-sm tabular-nums text-text-secondary">{pupil.subjectCount}</span>
                  <span className="text-sm text-text-muted">{pupil.subjects.join(", ")}</span>
                  <span className="text-sm font-medium tabular-nums text-text-secondary">TP{pupil.lowestTp}</span>
                  <span>
                    <StatusBadge tone={pupil.priority === "high" ? "warning" : "default"}>
                      {pupil.priority === "high"
                        ? text(language, { ms: "Keutamaan tinggi", en: "High priority" })
                        : text(language, { ms: "Satu subjek", en: "Single subject" })}
                    </StatusBadge>
                  </span>
                  <span>
                    <StatusBadge tone={pupil.severity === "urgent" ? "warning" : "default"}>
                      {pupil.severity === "urgent"
                        ? text(language, { ms: "Segera", en: "Urgent" })
                        : pupil.severity === "coordinated"
                          ? text(language, { ms: "Selaras", en: "Coordinated" })
                          : text(language, { ms: "Pantau", en: "Monitor" })}
                    </StatusBadge>
                  </span>
                </summary>
                <div className="bg-surface-inset/60 px-5 pb-5">
                  <div className="grid gap-3">
                    {pupil.entries.map((entry) => (
                      <article key={`${pupil.key}-${entry.subjectCode}`} className="rounded-lg border border-border-default bg-surface-card p-4">
                        {(() => {
                          const dialogRow = dialogRowByEntry.get(`${interventionPupilKey(entry)}|${entry.subjectCode}`);
                          return (
                            <>
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge>{entry.subjectCode}</StatusBadge>
                          <StatusBadge tone={entry.tp === 1 ? "warning" : "default"}>TP{entry.tp}</StatusBadge>
                          {dialogRow ? (
                            <>
                              <StatusBadge>{dialogRow.theme}</StatusBadge>
                              <StatusBadge>{dialogRow.owner}</StatusBadge>
                            </>
                          ) : null}
                        </div>
                        <dl className="mt-3 grid gap-3 text-sm md:grid-cols-3">
                          <div>
                            <dt className="text-text-muted">{text(language, { ms: "Masalah", en: "Problem" })}</dt>
                            <dd className="mt-1 text-text-secondary">{entry.problem}</dd>
                          </div>
                          <div>
                            <dt className="text-text-muted">{text(language, { ms: "Intervensi", en: "Intervention" })}</dt>
                            <dd className="mt-1 text-text-secondary">{entry.intervention}</dd>
                          </div>
                          <div>
                            <dt className="text-text-muted">Tindakan seterusnya</dt>
                            <dd className="mt-1 text-text-secondary">
                              {dialogRow?.nextAction ?? "Sahkan punca isu dan pilih tindakan panitia yang sesuai."}
                            </dd>
                          </div>
                        </dl>
                            </>
                          );
                        })()}
                      </article>
                    ))}
                  </div>
                </div>
              </details>
            ))}
          </div>
        ) : (
          <p className="p-5 text-sm text-text-muted">
            {text(language, {
              ms: "Tiada entri intervensi sepadan dengan tapisan semasa.",
              en: "No intervention entries match the current filters.",
            })}
          </p>
        )}
      </section>

      <div className="mt-6 grid gap-4 xl:grid-cols-4">
        <SummaryPanel
          title={text(language, { ms: "Murid berulang", en: "Repeated pupils" })}
          rows={analysis.repeatedPupils.slice(0, 5).map((item) => ({
            label: item.studentName,
            value: `${item.subjectCount} ${text(language, { ms: "subjek", en: "subjects" })}`,
          }))}
          empty={text(language, { ms: "Belum ada murid berulang.", en: "No repeated pupils yet." })}
        />
        <SummaryPanel
          title={text(language, { ms: "Kelas paling terlibat", en: "Most affected classes" })}
          rows={analysis.classCounts.slice(0, 5).map((item) => ({
            label: item.className,
            value: `${item.pupilCount} ${text(language, { ms: "murid", en: "pupils" })}`,
          }))}
          empty={text(language, { ms: "Tiada data kelas.", en: "No class data." })}
        />
        <SummaryPanel
          title={text(language, { ms: "Subjek paling banyak entri", en: "Subjects with most entries" })}
          rows={analysis.subjectCounts.slice(0, 5).map((item) => ({
            label: item.subjectCode,
            value: `${item.entryCount}`,
          }))}
          empty={text(language, { ms: "Tiada data subjek.", en: "No subject data." })}
        />
        <SummaryPanel
          title={text(language, { ms: "Pertindihan subjek", en: "Subject overlaps" })}
          rows={analysis.overlapPairs.slice(0, 5).map((item) => ({
            label: item.subjects.join(" + "),
            value: `${item.pupilCount} ${text(language, { ms: "murid", en: "pupils" })}`,
          }))}
          empty={text(language, { ms: "Belum ada pertindihan.", en: "No overlaps yet." })}
        />
      </div>
    </AppShell>
  );
}

function SummaryPanel({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: Array<{ label: string; value: string }>;
  empty: string;
}) {
  return (
    <section className="rounded-xl border border-border-default bg-surface-card p-4 shadow-raised">
      <h2 className="font-display font-semibold text-text-primary">{title}</h2>
      {rows.length ? (
        <dl className="mt-3 space-y-3 text-sm">
          {rows.map((row) => (
            <div key={`${row.label}-${row.value}`} className="flex items-start justify-between gap-3">
              <dt className="text-text-secondary">{row.label}</dt>
              <dd className="tabular-nums text-text-muted">{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="mt-3 text-sm text-text-muted">{empty}</p>
      )}
    </section>
  );
}
