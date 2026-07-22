import { BarChart3, PenLine, UsersRound } from "lucide-react";
import { AppShell } from "@/components/shared/AppShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
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
        actions={<div className="flex items-center gap-2"><Button variant="outline" size="sm" icon={PenLine} href={`${assessmentBasePath(period)}/entry`}>{text(language, { ms: "Isi markah", en: "Enter marks" })}</Button><StatusBadge tone="success">{classes.length} {text(language, { ms: "kelas tersedia", en: "classes available" })}</StatusBadge></div>}
        icon={UsersRound}
      />

      {!results.length ? (
        <EmptyState
          icon={UsersRound}
          title="Daftar murid sekolah"
          description={`Sediakan roster pusat sekarang supaya rekod murid boleh dipadankan apabila aliran pangkalan data ${label} dibuka.`}
          className="mt-6"
          action={<Button variant="secondary" href={`/school/setup?year=${period.year}&view=pupils`}>Buka Murid dalam Setup Sekolah</Button>}
        />
      ) : null}

      <div className="mt-6 space-y-6">
        {[...grouped.entries()].map(([level, levelClasses]) => (
          <section key={level}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-lg font-semibold text-text-primary">{text(language, { ms: "Tahun", en: "Year" })} {level}</h2>
              <Button variant="outline" size="sm" icon={BarChart3} href={assessmentYearPath(period, level)}>
                {text(language, { ms: "Analisis seluruh tahun", en: "Whole-year analysis" })}
              </Button>
            </div>
            <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {levelClasses.map((result) => (
                <Card key={result.className} hover className="flex h-full flex-col">
                  <CardContent className="flex h-full flex-col p-5">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary-600"><UsersRound className="h-[18px] w-[18px]" aria-hidden="true" /></span>
                      <h3 className="font-display text-lg font-semibold text-text-primary">{result.className}</h3>
                    </div>
                    <dl className="mt-3 grid grid-cols-[7rem_1fr] gap-x-3 gap-y-1 text-sm">
                      <dt className="text-text-muted">{text(language, { ms: "Pentaksiran", en: "Assessment" })}</dt>
                      <dd className="text-text-secondary">{result.assessmentName || label}</dd>
                      <dt className="text-text-muted">{text(language, { ms: "Kod sekolah", en: "School code" })}</dt>
                      <dd className="text-text-secondary">{result.schoolCode || school.code}</dd>
                      <dt className="text-text-muted">{text(language, { ms: "Guru kelas", en: "Class teacher" })}</dt>
                      <dd className="min-h-10 text-text-secondary">{result.teacherName}</dd>
                      <dt className="text-text-muted">{text(language, { ms: "Guru besar", en: "Headteacher" })}</dt>
                      <dd className="min-h-10 text-text-secondary">{result.headteacherName || school.headteacher.name}</dd>
                    </dl>
                    <p className="mt-auto pt-4 text-sm tabular-nums text-text-muted">{result.students.length} {text(language, { ms: "murid", en: "pupils" })}</p>
                    <div className="mt-4 flex gap-2 text-sm">
                      <Button variant="outline" size="sm" href={assessmentClassPath(period, result.className)}>
                        {text(language, { ms: "Buka kelas", en: "Open class" })}
                      </Button>
                      <Button variant="primary" size="sm" href={`${assessmentClassPath(period, result.className)}/analysis`}>
                        {text(language, { ms: "Analisis", en: "Analysis" })}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
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
        <Button variant="outline" size="sm" href={`${assessmentBasePath(period)}/years`}>
          {text(language, { ms: "Lihat semua analisis tahun", en: "View all year analyses" })}
        </Button>
      </div>
    </AppShell>
  );
}
