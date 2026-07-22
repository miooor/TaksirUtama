import { AppShell } from "@/components/shared/AppShell";
import { ComparisonBarChart } from "@/components/shared/ComparisonBarChart";
import { ExportMeta } from "@/components/shared/ExportMeta";
import { MetricCard } from "@/components/shared/MetricCard";
import { PageHeader } from "@/components/shared/PageHeader";
import { SimpleBarChart } from "@/components/shared/SimpleBarChart";
import { StackedBarChart } from "@/components/shared/StackedBarChart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, TableShell, TD, TH, THead, TRow } from "@/components/ui/table";
import { getAssessmentClassResultHybrid } from "@/lib/upsa/data";
import { calculateUpsaClassAnalysis } from "@/lib/upsa/calculateUpsaClassAnalysis";
import { assessmentApiBasePath, assessmentClassPath, getAssessmentActorPageContext } from "@/lib/assessmentPages";
import { assessmentLabel } from "@/lib/config/periods";

const gradeOrder = ["A", "B", "C", "D", "E", "F"];
const gradeColors = {
  A: "bg-success",
  B: "bg-primary-500",
  C: "bg-info",
  D: "bg-accent-400",
  E: "bg-accent-600",
  F: "bg-danger",
} as const;

export default async function AssessmentAnalysisPage({
  params,
}: {
  params: Promise<{ year: string; assessment: string; className: string }>;
}) {
  const { className } = await params;
  const { context, period } = await getAssessmentActorPageContext(params);
  const result = await getAssessmentClassResultHybrid(context, period, decodeURIComponent(className));
  const analysis = calculateUpsaClassAnalysis(result);
  const classPath = assessmentClassPath(period, result.className);
  const apiBase = assessmentApiBasePath(period);

  return (
    <AppShell>
      <PageHeader
        eyebrow={`Analisis ${assessmentLabel(period)} ${period.year}`}
        title={analysis.className}
        description={period.examName}
        actions={
          <>
            <Button variant="outline" size="sm" href={classPath}>Kembali ke kelas</Button>
            <Button variant="outline" size="sm" href={`${apiBase}/reports/${encodeURIComponent(result.className)}/analysis-csv`}>
              Muat turun CSV
            </Button>
            <a href={`${apiBase}/reports/${encodeURIComponent(result.className)}/analysis-pdf`} className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary-700 bg-primary-700 px-3.5 py-2 text-sm font-semibold text-white shadow-raised transition-colors hover:bg-primary-800">
              Muat turun PDF analisis
            </a>
          </>
        }
      />

      <div className="mt-6 grid gap-4 md:grid-cols-6">
        {[
          { label: "Murid", value: analysis.pupilCount },
          { label: "Dengan markah", value: analysis.pupilsWithMarks },
          { label: "Markah hilang", value: analysis.pupilsWithMissingMarks, tone: "warning" as const },
          { label: "TH", value: analysis.absentPupils.length },
          { label: "Purata kelas", value: analysis.classAverage?.toFixed(1) ?? "-" },
          { label: "Perlu intervensi", value: analysis.interventionPupils.length },
        ].map(({ label, value, tone }) => (
          <MetricCard key={label} label={label} value={value} tone={tone} />
        ))}
      </div>
      <div className="mt-6"><ExportMeta /></div>

      <TableShell className="mt-6">
        <CardHeader className="border-b border-border-default px-5 py-4">
          <CardTitle>Prestasi mengikut subjek</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <DataTable className="min-w-[42rem]">
            <THead>
              <tr>
                <TH>Subjek</TH><TH>Diisi</TH><TH>Hilang</TH><TH>TH</TH><TH>Purata</TH><TH>Tertinggi</TH><TH>Terendah</TH><TH>Lulus</TH>
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
                  <TD className="tabular-nums">{subject.highestMark ?? "-"}</TD>
                  <TD className="tabular-nums">{subject.lowestMark ?? "-"}</TD>
                  <TD className="tabular-nums">{subject.passPercentage?.toFixed(1) ?? "-"}%</TD>
                </TRow>
              ))}
            </tbody>
          </DataTable>
        </div>
      </TableShell>

      <div className="mt-6 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <CardHeader><CardTitle>Taburan gred keseluruhan</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
              {gradeOrder.map((grade) => (
                <div key={grade} className="rounded-lg bg-surface-inset p-3 text-center">
                  <p className="text-sm font-medium text-text-muted">{grade}</p>
                  <p className="mt-1 font-display text-xl font-bold tabular-nums text-text-primary">{analysis.overallGradeDistribution[grade] ?? 0}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <SimpleBarChart
          title="Purata subjek"
          data={analysis.subjectAnalyses
            .filter((subject) => subject.average !== null)
            .map((subject) => ({ label: subject.subjectCode, value: Number(subject.average?.toFixed(1)) }))}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <StackedBarChart
          title="Taburan gred mengikut subjek"
          rows={analysis.subjectAnalyses.map((subject) => ({
            label: subject.subjectCode,
            segments: gradeOrder.map((grade) => ({
              key: grade,
              label: grade,
              value: subject.gradeDistribution[grade] ?? 0,
              colorClassName: gradeColors[grade as keyof typeof gradeColors],
            })),
          }))}
        />
        <ComparisonBarChart
          title="Purata dan kadar lulus"
          rows={analysis.subjectAnalyses.map((subject) => ({
            label: subject.subjectCode,
            values: {
              average: subject.average ?? 0,
              passRate: subject.passPercentage ?? 0,
            },
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
