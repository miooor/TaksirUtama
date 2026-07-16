import Link from "next/link";
import { ClipboardList, UsersRound } from "lucide-react";
import { AppShell } from "@/components/shared/AppShell";
import { ExportMeta } from "@/components/shared/ExportMeta";
import { MetricCard } from "@/components/shared/MetricCard";
import { PageHeader } from "@/components/shared/PageHeader";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { UpsaStudentTable } from "@/components/upsa/UpsaStudentTable";
import { getAssessmentClassResult } from "@/lib/upsa/data";
import { calculateUpsaClassAnalysis } from "@/lib/upsa/calculateUpsaClassAnalysis";
import { getLanguage, text } from "@/lib/i18n";
import { assessmentApiBasePath, assessmentClassPath, getAssessmentPageContext } from "@/lib/assessmentPages";
import { assessmentLabel } from "@/lib/config/periods";

export default async function AssessmentClassPage({
  params,
}: {
  params: Promise<{ year: string; assessment: string; className: string }>;
}) {
  const { className } = await params;
  const { school, period } = await getAssessmentPageContext(params);
  const result = await getAssessmentClassResult(school, period, decodeURIComponent(className));
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
            <Link href={`${classPath}/analysis`} className="rounded-md border px-3 py-2">
              {text(language, { ms: "Analisis kelas", en: "Class analysis" })}
            </Link>
            <Link href={`${classPath}/slips`} className="rounded-md border px-3 py-2">
              {text(language, { ms: "Pratonton slip", en: "Preview slips" })}
            </Link>
            <a href={`${apiBase}/slips/${encodeURIComponent(result.className)}/pdf`} className="action-accent">
              {text(language, { ms: "Muat turun semua slip", en: "Download all slips" })}
            </a>
          </>
        }
      />

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
          <p className="text-sm text-slate-500">{result.students.length} {text(language, { ms: "rekod", en: "records" })}</p>
        </div>
        <UpsaStudentTable students={result.students} period={period} />
      </section>
    </AppShell>
  );
}
