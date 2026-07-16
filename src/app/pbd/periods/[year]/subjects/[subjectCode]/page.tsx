import Link from "next/link";
import { BookMarked } from "lucide-react";
import { AppShell } from "@/components/shared/AppShell";
import { MetricCard } from "@/components/shared/MetricCard";
import { PageHeader } from "@/components/shared/PageHeader";
import { PbdYearClassComparisonReport } from "@/components/pbd/PbdYearClassComparisonReport";
import { calculatePbdSubjectAnalysis } from "@/lib/pbd/analysis";
import { getPbdSubjectRecords } from "@/lib/pbd/data";
import { getLanguage, text } from "@/lib/i18n";
import { getPbdPageContext, pbdApiBasePath, pbdBasePath } from "@/lib/pbdPages";

export default async function PbdPeriodSubjectPage({ params }: { params: Promise<{ year: string; subjectCode: string }> }) {
  const { subjectCode } = await params;
  const { school, period } = await getPbdPageContext(params);
  const analysis = calculatePbdSubjectAnalysis(subjectCode, await getPbdSubjectRecords(school, period, subjectCode));
  const language = await getLanguage();
  return (
    <AppShell>
      <PageHeader
        eyebrow={`PBD ${period.year}`}
        title={analysis.subjectName}
        icon={BookMarked}
        actions={
          <>
            <Link href={`${pbdBasePath(period)}/subjects`} className="rounded-md border px-3 py-2">{text(language, { ms: "Semua subjek", en: "All subjects" })}</Link>
            <a href={`${pbdApiBasePath(period)}/reports/subjects/${encodeURIComponent(subjectCode)}/csv`} className="rounded-md border px-3 py-2">{text(language, { ms: "Muat turun CSV", en: "Download CSV" })}</a>
            <a href={`${pbdApiBasePath(period)}/reports/subjects/${encodeURIComponent(subjectCode)}/pdf`} className="action-accent">{text(language, { ms: "Muat turun PDF", en: "Download PDF" })}</a>
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
