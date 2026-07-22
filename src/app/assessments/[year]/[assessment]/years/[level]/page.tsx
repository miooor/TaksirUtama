import { BarChart3, School } from "lucide-react";
import { AppShell } from "@/components/shared/AppShell";
import { ComparisonBarChart } from "@/components/shared/ComparisonBarChart";
import { MetricCard } from "@/components/shared/MetricCard";
import { PageHeader } from "@/components/shared/PageHeader";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { SimpleBarChart } from "@/components/shared/SimpleBarChart";
import { Button } from "@/components/ui/button";
import { DataTable, TableShell, TD, TH, THead, TRow } from "@/components/ui/table";
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
            <Button variant="outline" size="sm" href={`${assessmentBasePath(period)}/classes`}>{text(language, { ms: "Kembali ke kelas", en: "Back to classes" })}</Button>
            <a href={`${assessmentApiBasePath(period)}/reports/years/${level}/pdf`} className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary-700 bg-primary-700 px-3.5 py-2 text-sm font-semibold text-white shadow-raised transition-colors hover:bg-primary-800">{text(language, { ms: "Muat turun PDF", en: "Download PDF" })}</a>
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
        <TableShell>
          <div className="border-b border-border-default px-5 py-4">
            <SectionHeading icon={School} tone="indigo" title={text(language, { ms: "Prestasi subjek seluruh tahun", en: "Whole-year subject performance" })} />
          </div>
          <div className="overflow-x-auto">
            <DataTable className="min-w-[28rem]">
              <THead>
                <tr>
                  <TH>{text(language, { ms: "Subjek", en: "Subject" })}</TH>
                  <TH>{text(language, { ms: "Diisi", en: "Entered" })}</TH>
                  <TH>{text(language, { ms: "Hilang", en: "Missing" })}</TH>
                  <TH>TH</TH>
                  <TH>{text(language, { ms: "Purata", en: "Average" })}</TH>
                  <TH>{text(language, { ms: "Lulus", en: "Pass" })}</TH>
                </tr>
              </THead>
              <tbody>
                {analysis.subjectAnalyses.map((subject) => (
                  <TRow key={subject.subjectCode}>
                    <TD className="font-medium text-text-primary">{subject.subjectCode}</TD>
                    <TD className="tabular-nums">{subject.enteredCount}</TD>
                    <TD className="tabular-nums">{subject.missingCount}</TD>
                    <TD className="tabular-nums">{subject.absentCount}</TD>
                    <TD className="tabular-nums">{subject.average?.toFixed(1) ?? "-"}</TD>
                    <TD className="tabular-nums">{subject.passPercentage?.toFixed(1) ?? "-"}%</TD>
                  </TRow>
                ))}
              </tbody>
            </DataTable>
          </div>
        </TableShell>
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
            { key: "average", label: "Purata", colorClassName: "bg-primary-600" },
            { key: "passRate", label: "Lulus", colorClassName: "bg-info" },
          ]}
        />
      </div>
    </AppShell>
  );
}
