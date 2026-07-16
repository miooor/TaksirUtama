import Link from "next/link";
import { School } from "lucide-react";
import { AppShell } from "@/components/shared/AppShell";
import { MetricCard } from "@/components/shared/MetricCard";
import { PageHeader } from "@/components/shared/PageHeader";
import { PbdClassTable } from "@/components/pbd/PbdClassTable";
import { calculatePbdClassAnalysis } from "@/lib/pbd/analysis";
import { getAllPbdRecords } from "@/lib/pbd/data";
import { getLanguage, text } from "@/lib/i18n";
import { getPbdPageContext, pbdApiBasePath, pbdBasePath } from "@/lib/pbdPages";

export default async function PbdPeriodClassPage({ params }: { params: Promise<{ year: string; className: string }> }) {
  const { className } = await params;
  const { school, period } = await getPbdPageContext(params);
  const analysis = calculatePbdClassAnalysis(decodeURIComponent(className), await getAllPbdRecords(school, period));
  const language = await getLanguage();
  return (
    <AppShell>
      <PageHeader
        eyebrow={`PBD ${period.year}`}
        title={analysis.className}
        icon={School}
        actions={
          <>
            <Link href={`${pbdBasePath(period)}/classes`} className="rounded-md border px-3 py-2">{text(language, { ms: "Semua kelas", en: "All classes" })}</Link>
            <a href={`${pbdApiBasePath(period)}/reports/classes/${encodeURIComponent(analysis.className)}/csv`} className="rounded-md border px-3 py-2">{text(language, { ms: "Muat turun CSV", en: "Download CSV" })}</a>
            <a href={`${pbdApiBasePath(period)}/reports/classes/${encodeURIComponent(analysis.className)}/pdf`} className="action-accent">{text(language, { ms: "Muat turun PDF", en: "Download PDF" })}</a>
          </>
        }
      />
      <div className="mt-6 grid gap-4 md:grid-cols-4">
        {[
          { label: text(language, { ms: "Subjek", en: "Subjects" }), value: analysis.totalSubjects },
          { label: text(language, { ms: "Subjek lemah", en: "Low-attainment subjects" }), value: analysis.subjectsWithLowAchievement.length },
          { label: text(language, { ms: "Belum ditaksir", en: "Not assessed" }), value: analysis.subjectsWithNotAssessed.length },
          { label: text(language, { ms: "Isu data", en: "Data issues" }), value: analysis.dataIssues.length, tone: "warning" as const },
        ].map(({ label, value, tone }) => <MetricCard key={label} label={label} value={value} tone={tone} />)}
      </div>
      <PbdClassTable records={analysis.subjectRecords} language={language} />
    </AppShell>
  );
}
