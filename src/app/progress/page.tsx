import { Suspense } from "react";
import { TrendingUp } from "lucide-react";
import { AppShell } from "@/components/shared/AppShell";
import { MetricCard } from "@/components/shared/MetricCard";
import { PageHeader } from "@/components/shared/PageHeader";
import { ProgressFilters } from "@/components/progress/ProgressFilters";
import { EvidenceTable } from "@/components/progress/EvidenceTable";
import { PupilMovementTable } from "@/components/progress/PupilMovementTable";
import { MovementBadge } from "@/components/progress/MovementBadge";
import { requireActorContext } from "@/lib/auth/actor";
import { listPeriodYears } from "@/lib/config/periods";
import { getLanguage, text } from "@/lib/i18n";
import { fetchProgressData } from "@/lib/progress/data";
import { subjectDisplayName } from "@/lib/subjects";

type SearchParams = {
  year?: string;
  level?: string;
  classId?: string;
  subject?: string;
};

export default async function ProgressPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const language = await getLanguage();
  const context = await requireActorContext();
  const school = context.school;
  const params = await searchParams;

  const years = listPeriodYears(
    school.assessmentPeriods.filter((p) => p.enabled),
    school.pbdPeriods.filter((p) => p.enabled),
  );
  const year = params.year && years.includes(params.year) ? params.year : years[0] ?? "2026";
  const level = params.level ? Number(params.level) : null;
  const classId = params.classId ?? null;
  const subject = params.subject ?? null;

  const model = await fetchProgressData(context, school, year, level && Number.isInteger(level) && level >= 1 && level <= 6 ? level : null);

  // Derive filter options from the model
  const classNames = [...new Set([
    ...model.classMovements.map((m) => m.label),
    ...model.pbdMovements.map((m) => m.className),
    ...model.evidenceRows.map((r) => r.className),
  ])].sort((a, b) => a.localeCompare(b, "ms"));
  const subjectCodes = [...new Set([
    ...model.subjectMovements.map((m) => m.label),
    ...model.pbdMovements.map((m) => m.subjectCode),
    ...model.evidenceRows.map((r) => r.subjectCode),
  ])].sort((a, b) => a.localeCompare(b, "ms"));

  const classes = classNames.map((name) => ({ name, level: Number(name[0]) || 0 }));

  // Determine active view based on URL params
  const isPupilView = classId !== null && subject !== null;
  const isClassView = classId !== null && subject === null;
  const isSubjectView = subject !== null && classId === null;

  // Filter evidence rows for class/subject views
  const filteredEvidence = model.evidenceRows.filter((row) => {
    if (classId && row.className !== classId) return false;
    if (subject && row.subjectCode !== subject) return false;
    return true;
  });

  // Filter pupil movements for pupil view
  const filteredPupils = model.pupilMovements.filter((m) => {
    if (classId && m.className !== classId) return false;
    if (subject && m.subjectCode !== subject) return false;
    return true;
  });

  return (
    <AppShell>
      <PageHeader
        eyebrow={text(language, { ms: "Analisis kemajuan", en: "Progress analysis" })}
        title={text(language, { ms: "Kemajuan", en: "Progress" })}
        description={text(language, {
          ms: "Perbandingan UPSA → UASA dan PBD Semester 1 → Semester 2",
          en: "UPSA → UASA and PBD Semester 1 → Semester 2 comparison",
        })}
        icon={TrendingUp}
      />

      <div className="mt-6">
        <Suspense fallback={null}>
          <ProgressFilters
            year={year}
            years={years}
            level={params.level ?? null}
            classId={classId}
            subject={subject}
            classes={classes}
            subjects={subjectCodes}
          />
        </Suspense>
      </div>

      {/* Warnings */}
      {model.warnings.length > 0 ? (
        <div className="mt-4 space-y-2" role="alert">
          {model.warnings.map((warning) => (
            <p key={warning} className="rounded-lg border border-warning/20 bg-warning/5 px-4 py-2.5 text-sm text-text-secondary">
              {warning}
            </p>
          ))}
        </div>
      ) : null}

      {/* Metric cards */}
      <div className="mt-6 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <MetricCard
          label={text(language, { ms: "Murid sepadan", en: "Matched pupils" })}
          value={model.coverage.matchedInBoth}
        />
        <MetricCard
          label={text(language, { ms: "Meningkat", en: "Improved" })}
          value={model.schoolMovement?.improvedCount ?? 0}
          tone="success"
        />
        <MetricCard
          label={text(language, { ms: "Stabil", en: "Stable" })}
          value={model.schoolMovement?.stableCount ?? 0}
        />
        <MetricCard
          label={text(language, { ms: "Menurun", en: "Declined" })}
          value={model.schoolMovement?.declinedCount ?? 0}
          tone="warning"
        />
        <MetricCard
          label={text(language, { ms: "Liputan", en: "Coverage" })}
          value={`${Math.round((model.schoolMovement?.coverageRatio ?? 0) * 100)}%`}
        />
        <MetricCard
          label={text(language, { ms: "Purata perubahan", en: "Average delta" })}
          value={model.schoolMovement?.averageDelta != null
            ? `${model.schoolMovement.averageDelta > 0 ? "+" : ""}${model.schoolMovement.averageDelta.toFixed(1)}`
            : "-"}
        />
      </div>

      {/* Main content area */}
      <div className="mt-8">
        {isPupilView ? (
          <section aria-label={text(language, { ms: "Pergerakan murid", en: "Pupil movement" })}>
            <h2 className="font-display text-lg font-semibold text-text-primary">
              {text(language, { ms: "Pergerakan murid", en: "Pupil movement" })}
              {classId ? ` — ${classId}` : ""}
              {subject ? ` — ${subjectDisplayName(subject)}` : ""}
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              {filteredPupils.length} {text(language, { ms: "murid sepadan", en: "matched pupils" })}
            </p>
            <div className="mt-4">
              <PupilMovementTable movements={filteredPupils} />
            </div>
          </section>
        ) : isClassView || isSubjectView ? (
          <section aria-label={text(language, { ms: "Bukti gabungan", en: "Combined evidence" })}>
            <h2 className="font-display text-lg font-semibold text-text-primary">
              {isClassView
                ? `${text(language, { ms: "Kelas", en: "Class" })}: ${classId}`
                : `${text(language, { ms: "Subjek", en: "Subject" })}: ${subjectDisplayName(subject!)}`}
            </h2>
            <div className="mt-4">
              <EvidenceTable rows={filteredEvidence} year={year} />
            </div>
          </section>
        ) : (
          <section aria-label={text(language, { ms: "Gambaran keseluruhan", en: "School overview" })}>
            <h2 className="font-display text-lg font-semibold text-text-primary">
              {text(language, { ms: "Gambaran keseluruhan sekolah", en: "School overview" })}
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              {text(language, {
                ms: "Baris disusun mengikut keutamaan — penurunan dan jurang bukti dahulu.",
                en: "Rows sorted by priority — declines and evidence gaps first.",
              })}
            </p>
            <div className="mt-4">
              <EvidenceTable rows={filteredEvidence} year={year} />
            </div>
          </section>
        )}
      </div>

      {/* Subject movements summary (school overview only) */}
      {!isPupilView && !isClassView && !isSubjectView && model.subjectMovements.length > 0 ? (
        <section className="mt-8" aria-label={text(language, { ms: "Ringkasan subjek", en: "Subject summary" })}>
          <h2 className="font-display text-lg font-semibold text-text-primary">
            {text(language, { ms: "Ringkasan mengikut subjek", en: "Subject summary" })}
          </h2>
          <div className="mt-4 overflow-x-auto rounded-xl border border-border-default bg-surface-card shadow-raised">
            <table className="w-full min-w-[40rem] text-sm">
              <thead>
                <tr className="border-b border-border-default bg-surface-inset/50 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                  <th className="px-4 py-3">Subjek</th>
                  <th className="px-4 py-3 text-right">Murid sepadan</th>
                  <th className="px-4 py-3 text-right">Meningkat</th>
                  <th className="px-4 py-3 text-right">Stabil</th>
                  <th className="px-4 py-3 text-right">Menurun</th>
                  <th className="px-4 py-3 text-right">Purata perubahan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {model.subjectMovements.map((m) => (
                  <tr key={m.label} className="transition-colors hover:bg-surface-inset/40">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-text-primary">
                      {subjectDisplayName(m.label)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-text-secondary">{m.matchedCount}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-success">{m.improvedCount}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-text-secondary">{m.stableCount}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-warning">{m.declinedCount}</td>
                    <td className={`px-4 py-3 text-right font-semibold tabular-nums ${
                      (m.averageDelta ?? 0) < 0 ? "text-warning" : (m.averageDelta ?? 0) > 0 ? "text-success" : "text-text-secondary"
                    }`}>
                      {m.averageDelta != null ? `${m.averageDelta > 0 ? "+" : ""}${m.averageDelta.toFixed(1)}` : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {/* PBD semester movements (school overview only) */}
      {!isPupilView && !isClassView && !isSubjectView && model.pbdMovements.length > 0 ? (
        <section className="mt-8" aria-label={text(language, { ms: "Pergerakan PBD", en: "PBD movement" })}>
          <h2 className="font-display text-lg font-semibold text-text-primary">
            {text(language, { ms: "PBD Semester 1 → Semester 2", en: "PBD Semester 1 → Semester 2" })}
          </h2>
          <p className="mt-1 text-sm text-text-muted">
            {text(language, {
              ms: "Perbandingan agregat TP pada tahap kelas-subjek. Bukan data individu murid.",
              en: "Aggregate TP comparison at class-subject level. Not pupil-level data.",
            })}
          </p>
          <div className="mt-4 overflow-x-auto rounded-xl border border-border-default bg-surface-card shadow-raised">
            <table className="w-full min-w-[44rem] text-sm">
              <thead>
                <tr className="border-b border-border-default bg-surface-inset/50 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                  <th className="px-4 py-3">Kelas</th>
                  <th className="px-4 py-3">Subjek</th>
                  <th className="px-4 py-3 text-right">Rendah S1</th>
                  <th className="px-4 py-3 text-right">Rendah S2</th>
                  <th className="px-4 py-3 text-right">Tinggi S1</th>
                  <th className="px-4 py-3 text-right">Tinggi S2</th>
                  <th className="px-4 py-3">Arah</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {model.pbdMovements.map((m) => (
                  <tr key={`${m.className}|${m.subjectCode}`} className="transition-colors hover:bg-surface-inset/40">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-text-primary">{m.className}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-text-secondary">{subjectDisplayName(m.subjectCode)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-text-secondary">{m.sem1 ? `${m.sem1.low.toFixed(0)}%` : "-"}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-text-secondary">{m.sem2 ? `${m.sem2.low.toFixed(0)}%` : "-"}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-text-secondary">{m.sem1 ? `${m.sem1.high.toFixed(0)}%` : "-"}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-text-secondary">{m.sem2 ? `${m.sem2.high.toFixed(0)}%` : "-"}</td>
                    <td className="px-4 py-3"><MovementBadge direction={m.direction} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </AppShell>
  );
}
