import Link from "next/link";
import { BarChart3, UsersRound } from "lucide-react";
import { AppShell } from "@/components/shared/AppShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { UpsaReadinessPanel } from "@/components/upsa/UpsaReadinessPanel";
import { AssessmentYearClassGradeReport } from "@/components/upsa/AssessmentYearClassGradeReport";
import { HeatmapTable } from "@/components/shared/HeatmapTable";
import { getAllAssessmentClassResults } from "@/lib/upsa/data";
import { calculateUpsaCompletionHeatmap, calculateUpsaReadiness } from "@/lib/upsa/readiness";
import { getLanguage, text } from "@/lib/i18n";
import { assessmentBasePath, assessmentClassPath, assessmentYearPath, getAssessmentPageContext } from "@/lib/assessmentPages";
import { assessmentLabel } from "@/lib/config/periods";
import { calculateUpsaYearAnalysis } from "@/lib/upsa/calculateUpsaYearAnalysis";

export default async function AssessmentClassesPage({ params }: { params: Promise<{ year: string; assessment: string }> }) {
  const { school, period } = await getAssessmentPageContext(params);
  const results = await getAllAssessmentClassResults(school, period);
  const classes = results.map((result) => result.className);
  const grouped = Map.groupBy(results, (result) => result.className.split(" ")[0]);
  const readiness = calculateUpsaReadiness(results);
  const heatmap = calculateUpsaCompletionHeatmap(results);
  const language = await getLanguage();
  const label = assessmentLabel(period);

  return (
    <AppShell>
      <PageHeader
        eyebrow={`${label} ${period.year}`}
        title={text(language, { ms: "Pilih kelas", en: "Choose class" })}
        description={period.examName}
        actions={<StatusBadge tone="success">{classes.length} {text(language, { ms: "kelas tersedia", en: "classes available" })}</StatusBadge>}
        icon={UsersRound}
      />

      <div className="mt-6 space-y-6">
        {[...grouped.entries()].map(([level, levelClasses]) => (
          <section key={level}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">{text(language, { ms: "Tahun", en: "Year" })} {level}</h2>
              <Link href={assessmentYearPath(period, level)} className="action-secondary gap-2 text-sm">
                <BarChart3 className="h-4 w-4" />
                {text(language, { ms: "Analisis seluruh tahun", en: "Whole-year analysis" })}
              </Link>
            </div>
            <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {levelClasses.map((result) => (
                <article key={result.className} className="flex h-full flex-col rounded-lg border bg-white p-5">
                  <div className="flex items-center gap-3">
                    <UsersRound className="h-5 w-5 text-teal-700" />
                    <h3 className="text-lg font-semibold">{result.className}</h3>
                  </div>
                  <dl className="mt-3 grid grid-cols-[7rem_1fr] gap-x-3 gap-y-1 text-sm">
                    <dt className="text-slate-500">{text(language, { ms: "Pentaksiran", en: "Assessment" })}</dt>
                    <dd>{result.assessmentName || label}</dd>
                    <dt className="text-slate-500">{text(language, { ms: "Kod sekolah", en: "School code" })}</dt>
                    <dd>{result.schoolCode || school.code}</dd>
                    <dt className="text-slate-500">{text(language, { ms: "Guru kelas", en: "Class teacher" })}</dt>
                    <dd className="min-h-10">{result.teacherName}</dd>
                    <dt className="text-slate-500">{text(language, { ms: "Guru besar", en: "Headteacher" })}</dt>
                    <dd className="min-h-10">{result.headteacherName || school.headteacher.name}</dd>
                  </dl>
                  <p className="mt-auto pt-4 text-sm text-slate-600">{result.students.length} {text(language, { ms: "murid", en: "pupils" })}</p>
                  <div className="mt-4 flex gap-2 text-sm">
                    <Link href={assessmentClassPath(period, result.className)} className="rounded-md border px-3 py-2">
                      {text(language, { ms: "Buka kelas", en: "Open class" })}
                    </Link>
                    <Link href={`${assessmentClassPath(period, result.className)}/analysis`} className="action-accent">
                      {text(language, { ms: "Analisis", en: "Analysis" })}
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
      <div className="mt-6 space-y-6">
        {[...grouped.entries()].map(([level, levelClasses]) => {
          const analysis = calculateUpsaYearAnalysis(level, levelClasses);
          return (
            <AssessmentYearClassGradeReport
              key={level}
              assessmentLabel={label}
              level={level}
              classes={analysis.classGradeComparisons}
              language={language}
            />
          );
        })}
      </div>
      <div className="mt-6">
        <UpsaReadinessPanel readiness={readiness} language={language} />
      </div>
      <div className="mt-6">
        <HeatmapTable
          title={text(language, { ms: "Heatmap kelengkapan markah", en: "Marks completion heatmap" })}
          description={text(language, {
            ms: `Peratus markah diproses bagi setiap kelas dan subjek ${label}.`,
            en: `Percentage of processed marks for each ${label} class and subject.`,
          })}
          columns={heatmap.subjectCodes}
          rows={heatmap.rows.map((row) => ({
            label: row.className,
            cells: row.subjects.map((subject) => ({
              value: subject.completionPercentage,
              label: `${subject.entered}/${subject.total} markah diproses, ${subject.absent} TH`,
            })),
          }))}
          tone="completion"
          language={language}
        />
      </div>
      <div className="mt-6">
        <Link href={`${assessmentBasePath(period)}/years`} className="rounded-md border px-3 py-2 text-sm">
          {text(language, { ms: "Lihat semua analisis tahun", en: "View all year analyses" })}
        </Link>
      </div>
    </AppShell>
  );
}
