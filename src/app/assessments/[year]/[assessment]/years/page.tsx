import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { AppShell } from "@/components/shared/AppShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { getAllAssessmentClassResults } from "@/lib/upsa/data";
import { calculateUpsaYearAnalysis } from "@/lib/upsa/calculateUpsaYearAnalysis";
import { getLanguage, text } from "@/lib/i18n";
import { assessmentApiBasePath, assessmentYearPath, getAssessmentPageContext } from "@/lib/assessmentPages";
import { assessmentLabel } from "@/lib/config/periods";

export default async function AssessmentYearsPage({ params }: { params: Promise<{ year: string; assessment: string }> }) {
  const { school, period } = await getAssessmentPageContext(params);
  const results = await getAllAssessmentClassResults(school, period);
  const grouped = Map.groupBy(results, (result) => result.className.split(" ")[0]);
  const language = await getLanguage();

  return (
    <AppShell>
      <PageHeader
        eyebrow={`${assessmentLabel(period)} ${period.year}`}
        title={text(language, { ms: "Analisis seluruh tahun", en: "Whole-year analysis" })}
        description={period.examName}
        icon={BarChart3}
        actions={<a href={`${assessmentApiBasePath(period)}/reports/years/pdf`} className="action-accent">{text(language, { ms: "Muat turun PDF", en: "Download PDF" })}</a>}
      />

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {[...grouped.entries()].map(([level, levelClasses]) => {
          const analysis = calculateUpsaYearAnalysis(level, levelClasses);
          return (
            <Link key={level} href={assessmentYearPath(period, level)} className="rounded-lg border bg-white p-5 hover:bg-stone-50">
              <BarChart3 className="h-5 w-5 text-teal-700" />
              <h2 className="mt-4 text-lg font-semibold">{text(language, { ms: "Tahun", en: "Year" })} {level}</h2>
              <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                <div><p className="text-slate-500">{text(language, { ms: "Kelas", en: "Classes" })}</p><p className="mt-1 font-semibold">{analysis.classCount}</p></div>
                <div><p className="text-slate-500">{text(language, { ms: "Murid", en: "Pupils" })}</p><p className="mt-1 font-semibold">{analysis.pupilCount}</p></div>
                <div><p className="text-slate-500">{text(language, { ms: "Intervensi", en: "Intervention" })}</p><p className="mt-1 font-semibold">{analysis.interventionPupils.length}</p></div>
              </div>
            </Link>
          );
        })}
      </div>
    </AppShell>
  );
}
