import Link from "next/link";
import { BarChart3, School } from "lucide-react";
import { AppShell } from "@/components/shared/AppShell";
import { ComparisonBarChart } from "@/components/shared/ComparisonBarChart";
import { MetricCard } from "@/components/shared/MetricCard";
import { PageHeader } from "@/components/shared/PageHeader";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { SimpleBarChart } from "@/components/shared/SimpleBarChart";
import { UpsaSubjectGradeStackedColumns } from "@/components/upsa/UpsaSubjectGradeStackedColumns";
import { calculateUpsaYearAnalysis } from "@/lib/upsa/calculateUpsaYearAnalysis";
import { getAssessmentClassResult } from "@/lib/upsa/data";
import { listAssessmentClassTabs } from "@/lib/upsa/listUpsaClassTabs";
import { getLanguage, text } from "@/lib/i18n";
import { assessmentApiBasePath, assessmentBasePath, getAssessmentPageContext } from "@/lib/assessmentPages";
import { assessmentLabel } from "@/lib/config/periods";

export default async function AssessmentYearAnalysisPage({
  params,
}: {
  params: Promise<{ year: string; assessment: string; level: string }>;
}) {
  const { level } = await params;
  const { school, period } = await getAssessmentPageContext(params);
  const classes = (await listAssessmentClassTabs(school, period)).filter((className) => className.startsWith(`${level} `));
  const results = await Promise.all(classes.map((className) => getAssessmentClassResult(school, period, className)));
  const analysis = calculateUpsaYearAnalysis(level, results);
  const language = await getLanguage();

  return (
    <AppShell>
      <PageHeader
        eyebrow={`${text(language, { ms: "Analisis tahunan", en: "Year analysis" })} ${assessmentLabel(period)} ${period.year}`}
        title={`${text(language, { ms: "Tahun", en: "Year" })} ${level}`}
        description={period.examName}
        icon={BarChart3}
        actions={
          <>
            <Link href={`${assessmentBasePath(period)}/classes`} className="rounded-md border px-3 py-2">{text(language, { ms: "Kembali ke kelas", en: "Back to classes" })}</Link>
            <a href={`${assessmentApiBasePath(period)}/reports/years/${level}/pdf`} className="action-accent">{text(language, { ms: "Muat turun PDF", en: "Download PDF" })}</a>
          </>
        }
      />

      <div className="mt-6 grid gap-4 md:grid-cols-6">
        {[
          { label: text(language, { ms: "Kelas", en: "Classes" }), value: analysis.classCount },
          { label: text(language, { ms: "Murid", en: "Pupils" }), value: analysis.pupilCount },
          { label: text(language, { ms: "Dengan markah", en: "With marks" }), value: analysis.pupilsWithMarks },
          { label: "TH", value: analysis.absentPupils.length },
          { label: text(language, { ms: "Purata tahun", en: "Year average" }), value: analysis.yearAverage?.toFixed(1) ?? "-" },
          { label: text(language, { ms: "Perlu intervensi", en: "Need intervention" }), value: analysis.interventionPupils.length, tone: "warning" as const },
        ].map(({ label, value, tone }) => <MetricCard key={label} label={label} value={value} tone={tone} />)}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="overflow-hidden rounded-lg border bg-white">
          <div className="border-b px-5 py-4">
            <SectionHeading icon={School} tone="indigo" title={text(language, { ms: "Prestasi subjek seluruh tahun", en: "Whole-year subject performance" })} />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[28rem] w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3">{text(language, { ms: "Subjek", en: "Subject" })}</th>
                  <th className="px-4 py-3">{text(language, { ms: "Diisi", en: "Entered" })}</th>
                  <th className="px-4 py-3">{text(language, { ms: "Hilang", en: "Missing" })}</th>
                  <th className="px-4 py-3">TH</th>
                  <th className="px-4 py-3">{text(language, { ms: "Purata", en: "Average" })}</th>
                  <th className="px-4 py-3">{text(language, { ms: "Lulus", en: "Pass" })}</th>
                </tr>
              </thead>
              <tbody>
                {analysis.subjectAnalyses.map((subject) => (
                  <tr key={subject.subjectCode} className="border-t">
                    <td className="px-4 py-3 font-medium">{subject.subjectCode}</td>
                    <td className="px-4 py-3">{subject.enteredCount}</td>
                    <td className="px-4 py-3">{subject.missingCount}</td>
                    <td className="px-4 py-3">{subject.absentCount}</td>
                    <td className="px-4 py-3">{subject.average?.toFixed(1) ?? "-"}</td>
                    <td className="px-4 py-3">{subject.passPercentage?.toFixed(1) ?? "-"}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <SimpleBarChart
          title={text(language, { ms: "Purata subjek", en: "Subject averages" })}
          data={analysis.subjectAnalyses.filter((subject) => subject.average !== null).map((subject) => ({ label: subject.subjectCode, value: Number(subject.average?.toFixed(1)) }))}
        />
      </div>

      {["4", "5", "6"].includes(level) ? (
        <div className="mt-6">
          <UpsaSubjectGradeStackedColumns year={level} comparisons={analysis.subjectClassGradeComparisons} language={language} />
        </div>
      ) : null}

      <div className="mt-6">
        <ComparisonBarChart
          title={text(language, { ms: "Purata dan kadar lulus", en: "Average and pass rate" })}
          rows={analysis.subjectAnalyses.map((subject) => ({
            label: subject.subjectCode,
            values: { average: subject.average ?? 0, passRate: subject.passPercentage ?? 0 },
          }))}
          series={[
            { key: "average", label: "Purata", colorClassName: "bg-teal-700" },
            { key: "passRate", label: "Lulus", colorClassName: "bg-sky-500" },
          ]}
        />
      </div>
    </AppShell>
  );
}
