import Link from "next/link";
import { AppShell } from "@/components/shared/AppShell";
import { ComparisonBarChart } from "@/components/shared/ComparisonBarChart";
import { ExportMeta } from "@/components/shared/ExportMeta";
import { MetricCard } from "@/components/shared/MetricCard";
import { PageHeader } from "@/components/shared/PageHeader";
import { SimpleBarChart } from "@/components/shared/SimpleBarChart";
import { StackedBarChart } from "@/components/shared/StackedBarChart";
import { getAssessmentClassResult } from "@/lib/upsa/data";
import { calculateUpsaClassAnalysis } from "@/lib/upsa/calculateUpsaClassAnalysis";
import { assessmentApiBasePath, assessmentClassPath, getAssessmentPageContext } from "@/lib/assessmentPages";
import { assessmentLabel } from "@/lib/config/periods";

const gradeOrder = ["A", "B", "C", "D", "E", "F"];
const gradeColors = {
  A: "bg-emerald-600",
  B: "bg-teal-500",
  C: "bg-sky-500",
  D: "bg-amber-400",
  E: "bg-orange-500",
  F: "bg-rose-600",
} as const;

export default async function AssessmentAnalysisPage({
  params,
}: {
  params: Promise<{ year: string; assessment: string; className: string }>;
}) {
  const { className } = await params;
  const { school, period } = await getAssessmentPageContext(params);
  const result = await getAssessmentClassResult(school, period, decodeURIComponent(className));
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
            <Link href={classPath} className="rounded-md border px-3 py-2">Kembali ke kelas</Link>
            <a href={`${apiBase}/reports/${encodeURIComponent(result.className)}/analysis-csv`} className="rounded-md border px-3 py-2">
              Muat turun CSV
            </a>
            <a href={`${apiBase}/reports/${encodeURIComponent(result.className)}/analysis-pdf`} className="action-accent">
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

      <section className="mt-6 overflow-hidden rounded-lg border bg-white">
        <div className="border-b px-5 py-4">
          <h2 className="text-lg font-semibold">Prestasi mengikut subjek</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[42rem] w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3">Subjek</th>
                <th className="px-4 py-3">Diisi</th>
                <th className="px-4 py-3">Hilang</th>
                <th className="px-4 py-3">TH</th>
                <th className="px-4 py-3">Purata</th>
                <th className="px-4 py-3">Tertinggi</th>
                <th className="px-4 py-3">Terendah</th>
                <th className="px-4 py-3">Lulus</th>
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
                  <td className="px-4 py-3">{subject.highestMark ?? "-"}</td>
                  <td className="px-4 py-3">{subject.lowestMark ?? "-"}</td>
                  <td className="px-4 py-3">{subject.passPercentage?.toFixed(1) ?? "-"}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <section className="rounded-lg border bg-white p-5">
          <h2 className="text-lg font-semibold">Taburan gred keseluruhan</h2>
          <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-6">
            {gradeOrder.map((grade) => (
              <div key={grade} className="rounded-md bg-slate-50 p-3 text-center">
                <p className="text-sm text-slate-500">{grade}</p>
                <p className="mt-1 text-xl font-semibold">{analysis.overallGradeDistribution[grade] ?? 0}</p>
              </div>
            ))}
          </div>
        </section>
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
            { key: "average", label: "Purata", colorClassName: "bg-teal-700" },
            { key: "passRate", label: "Lulus", colorClassName: "bg-sky-500" },
          ]}
        />
      </div>
    </AppShell>
  );
}
