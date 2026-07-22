import { CalendarRange } from "lucide-react";
import { AppShell } from "@/components/shared/AppShell";
import { ComparisonBarChart } from "@/components/shared/ComparisonBarChart";
import { MetricCard } from "@/components/shared/MetricCard";
import { PageHeader } from "@/components/shared/PageHeader";
import { StackedBarChart } from "@/components/shared/StackedBarChart";
import { Button } from "@/components/ui/button";
import { calculatePbdYearAnalysis } from "@/lib/pbd/analysis";
import { getAllPbdRecords } from "@/lib/pbd/data";
import { getLanguage, text } from "@/lib/i18n";
import { getPbdPageContext, pbdApiBasePath, pbdBasePath, pbdSemesterHref } from "@/lib/pbdPages";

export default async function PbdPeriodYearPage({ params, searchParams }: { params: Promise<{ year: string; level: string }>; searchParams: Promise<{ semester?: string }> }) {
  const { level } = await params;
  const query = await searchParams;
  const { school, period, semester } = await getPbdPageContext(params, query.semester);
  const analysis = calculatePbdYearAnalysis(Number(level), await getAllPbdRecords(school, period));
  const language = await getLanguage();
  return (
    <AppShell>
      <PageHeader
        eyebrow={`Semester ${semester} · ${period.year}`}
        title={`${text(language, { ms: "Tahun", en: "Year" })} ${analysis.year}`}
        icon={CalendarRange}
        actions={
          <>
            <Button variant="outline" size="sm" href={pbdSemesterHref(`${pbdBasePath(period)}/years`, semester)}>{text(language, { ms: "Semua tahun", en: "All years" })}</Button>
            <Button variant="outline" size="sm" href={pbdSemesterHref(`${pbdApiBasePath(period)}/reports/years/${analysis.year}/csv`, semester)}>{text(language, { ms: "Muat turun CSV", en: "Download CSV" })}</Button>
            <a href={pbdSemesterHref(`${pbdApiBasePath(period)}/reports/years/${analysis.year}/pdf`, semester)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary-700 bg-primary-700 px-3.5 py-2 text-sm font-semibold text-white shadow-raised transition-colors hover:bg-primary-800">{text(language, { ms: "Muat turun PDF", en: "Download PDF" })}</a>
          </>
        }
      />
      <div className="mt-6 grid gap-4 md:grid-cols-4">
        {[
          { label: text(language, { ms: "Kelas", en: "Classes" }), value: analysis.classNames.length },
          { label: text(language, { ms: "Subjek", en: "Subjects" }), value: analysis.subjectAnalyses.length },
          { label: text(language, { ms: "Subjek paling lemah", en: "Lowest-performing subject" }), value: analysis.weakestSubjects[0]?.subjectCode ?? "-" },
          { label: text(language, { ms: "Isu data", en: "Data issues" }), value: analysis.dataIssues.length, tone: "warning" as const },
        ].map(({ label, value, tone }) => <MetricCard key={label} label={label} value={value} tone={tone} />)}
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <StackedBarChart
          title="Taburan TP mengikut subjek"
          rows={analysis.subjectAnalyses.map((subject) => ({
            label: subject.subjectCode,
            segments: [
              { key: "TP1", label: "TP1", value: subject.aggregateTpCounts.TP1, colorClassName: "bg-danger" },
              { key: "TP2", label: "TP2", value: subject.aggregateTpCounts.TP2, colorClassName: "bg-accent-600" },
              { key: "TP3", label: "TP3", value: subject.aggregateTpCounts.TP3, colorClassName: "bg-accent-400" },
              { key: "TP4", label: "TP4", value: subject.aggregateTpCounts.TP4, colorClassName: "bg-info" },
              { key: "TP5", label: "TP5", value: subject.aggregateTpCounts.TP5, colorClassName: "bg-primary-500" },
              { key: "TP6", label: "TP6", value: subject.aggregateTpCounts.TP6, colorClassName: "bg-success" },
            ],
          }))}
        />
        <ComparisonBarChart
          title="Subjek lemah vs cemerlang"
          rows={analysis.subjectAnalyses.map((subject) => ({
            label: subject.subjectCode,
            values: {
              low: subject.aggregateTpPercentages.TP1 + subject.aggregateTpPercentages.TP2,
              high: subject.aggregateTpPercentages.TP5 + subject.aggregateTpPercentages.TP6,
            },
          }))}
          series={[
            { key: "low", label: "TP1+TP2", colorClassName: "bg-danger" },
            { key: "high", label: "TP5+TP6", colorClassName: "bg-success" },
          ]}
        />
      </div>
    </AppShell>
  );
}
