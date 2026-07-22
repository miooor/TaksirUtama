import { ClipboardList, UsersRound } from "lucide-react";
import { AppShell } from "@/components/shared/AppShell";
import { ExportMeta } from "@/components/shared/ExportMeta";
import { MetricCard } from "@/components/shared/MetricCard";
import { PageHeader } from "@/components/shared/PageHeader";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UpsaStudentTable } from "@/components/upsa/UpsaStudentTable";
import { getAssessmentClassResultHybrid } from "@/lib/upsa/data";
import { calculateUpsaClassAnalysis } from "@/lib/upsa/calculateUpsaClassAnalysis";
import { getLanguage, text } from "@/lib/i18n";
import { assessmentApiBasePath, assessmentClassPath, getAssessmentActorPageContext } from "@/lib/assessmentPages";
import { assessmentLabel } from "@/lib/config/periods";

export default async function AssessmentClassPage({
  params,
}: {
  params: Promise<{ year: string; assessment: string; className: string }>;
}) {
  const { className } = await params;
  const { context, school, period } = await getAssessmentActorPageContext(params);
  const result = await getAssessmentClassResultHybrid(context, period, decodeURIComponent(className));
  const analysis = calculateUpsaClassAnalysis(result);
  const language = await getLanguage();
  const classPath = assessmentClassPath(period, result.className);
  const apiBase = assessmentApiBasePath(period);

  return (
    <AppShell>
      <PageHeader
        eyebrow={`${assessmentLabel(period)} ${period.year}`}
        title={result.className}
        description={result.teacherName}
        icon={UsersRound}
        actions={
          <>
            <Button variant="outline" size="sm" href={`${classPath}/analysis`}>
              {text(language, { ms: "Analisis kelas", en: "Class analysis" })}
            </Button>
            <Button variant="outline" size="sm" href={`${classPath}/slips`}>
              {text(language, { ms: "Pratonton slip", en: "Preview slips" })}
            </Button>
            <a href={`${apiBase}/slips/${encodeURIComponent(result.className)}/pdf`} className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary-700 bg-primary-700 px-3.5 py-2 text-sm font-semibold text-white shadow-raised transition-colors hover:bg-primary-800">
              {text(language, { ms: "Muat turun semua slip", en: "Download all slips" })}
            </a>
          </>
        }
      />

      <Card className="mt-6">
        <CardContent className="grid gap-3 p-5 text-sm sm:grid-cols-2 lg:grid-cols-4">
          {[
            [text(language, { ms: "Pentaksiran", en: "Assessment" }), result.assessmentName || assessmentLabel(period)],
            [text(language, { ms: "Kod sekolah", en: "School code" }), result.schoolCode || school.code],
            [text(language, { ms: "Guru kelas", en: "Class teacher" }), result.teacherName],
            [text(language, { ms: "Guru besar", en: "Headteacher" }), result.headteacherName || school.headteacher.name],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-text-muted">{label}</dt>
              <dd className="mt-1 font-medium text-text-primary">{value}</dd>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-4 md:grid-cols-5">
        {[
          { label: text(language, { ms: "Murid", en: "Pupils" }), value: analysis.pupilCount },
          { label: text(language, { ms: "Purata kelas", en: "Class average" }), value: analysis.classAverage?.toFixed(1) ?? "-" },
          { label: text(language, { ms: "Markah hilang", en: "Missing marks" }), value: analysis.pupilsWithMissingMarks, tone: "warning" as const },
          { label: "TH", value: analysis.absentPupils.length },
          { label: text(language, { ms: "Perlu intervensi", en: "Need intervention" }), value: analysis.interventionPupils.length },
        ].map(({ label, value, tone }) => (
          <MetricCard key={label} label={label} value={value} tone={tone} />
        ))}
      </div>
      <div className="mt-6"><ExportMeta /></div>

      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <SectionHeading icon={ClipboardList} tone="sky" title={text(language, { ms: "Senarai murid", en: "Pupil list" })} />
          <p className="text-sm tabular-nums text-text-muted">{result.students.length} {text(language, { ms: "rekod", en: "records" })}</p>
        </div>
        <UpsaStudentTable students={result.students} period={period} />
      </section>
    </AppShell>
  );
}
