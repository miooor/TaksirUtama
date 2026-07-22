import { BookMarked } from "lucide-react";
import { AppShell } from "@/components/shared/AppShell";
import { MetricCard } from "@/components/shared/MetricCard";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { PbdYearClassComparisonReport } from "@/components/pbd/PbdYearClassComparisonReport";
import { calculatePbdSubjectAnalysis } from "@/lib/pbd/analysis";
import { getPbdSubjectRecords } from "@/lib/pbd/data";
import { getLanguage, text } from "@/lib/i18n";
import { getPbdPageContext, pbdApiBasePath, pbdBasePath, pbdSemesterHref } from "@/lib/pbdPages";

export default async function PbdPeriodSubjectPage({ params, searchParams }: { params: Promise<{ year: string; subjectCode: string }>; searchParams: Promise<{ semester?: string }> }) {
  const { subjectCode } = await params;
  const query = await searchParams;
  const { school, period, semester } = await getPbdPageContext(params, query.semester);
  const analysis = calculatePbdSubjectAnalysis(subjectCode, await getPbdSubjectRecords(school, period, subjectCode));
  const language = await getLanguage();
  return (
    <AppShell>
      <PageHeader
        eyebrow={`Semester ${semester} · ${period.year}`}
        title={analysis.subjectName}
        icon={BookMarked}
        actions={
          <>
            <Button variant="outline" size="sm" href={pbdSemesterHref(`${pbdBasePath(period)}/subjects`, semester)}>{text(language, { ms: "Semua subjek", en: "All subjects" })}</Button>
            <Button variant="outline" size="sm" href={pbdSemesterHref(`${pbdApiBasePath(period)}/reports/subjects/${encodeURIComponent(subjectCode)}/csv`, semester)}>{text(language, { ms: "Muat turun CSV", en: "Download CSV" })}</Button>
            <a href={pbdSemesterHref(`${pbdApiBasePath(period)}/reports/subjects/${encodeURIComponent(subjectCode)}/pdf`, semester)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary-700 bg-primary-700 px-3.5 py-2 text-sm font-semibold text-white shadow-raised transition-colors hover:bg-primary-800">{text(language, { ms: "Muat turun PDF", en: "Download PDF" })}</a>
          </>
        }
      />
      <div className="mt-6 grid gap-4 md:grid-cols-4">
        {[
          { label: text(language, { ms: "Kelas", en: "Classes" }), value: analysis.records.length },
          { label: text(language, { ms: "Jumlah murid", en: "Total pupils" }), value: analysis.totalPupils },
          { label: text(language, { ms: "Kelas lemah", en: "Low-attainment classes" }), value: analysis.lowAchievementClasses.length },
          { label: text(language, { ms: "Isu data", en: "Data issues" }), value: analysis.records.filter((record) => record.dataIssues.length > 0).length, tone: "warning" as const },
        ].map(({ label, value, tone }) => <MetricCard key={label} label={label} value={value} tone={tone} />)}
      </div>
      <div className="mt-6">
        <PbdYearClassComparisonReport
          title={text(language, {
            ms: "Analisis Perbandingan TP Tahun",
            en: "TP Comparison Year",
          })}
          records={analysis.records}
          language={language}
        />
      </div>
    </AppShell>
  );
}
