import { BarChart3 } from "lucide-react";
import { AppShell } from "@/components/shared/AppShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { getAllAssessmentClassResultsHybrid } from "@/lib/upsa/data";
import { calculateUpsaYearAnalysis } from "@/lib/upsa/calculateUpsaYearAnalysis";
import { getLanguage, text } from "@/lib/i18n";
import { assessmentApiBasePath, assessmentYearPath, getAssessmentActorPageContext } from "@/lib/assessmentPages";
import { assessmentLabel } from "@/lib/config/periods";

export default async function AssessmentYearsPage({ params }: { params: Promise<{ year: string; assessment: string }> }) {
  const { context, period } = await getAssessmentActorPageContext(params);
  const results = await getAllAssessmentClassResultsHybrid(context, period);
  const grouped = Map.groupBy(results, (result) => result.className.split(" ")[0]);
  const language = await getLanguage();

  return (
    <AppShell>
      <PageHeader
        eyebrow={`${assessmentLabel(period)} ${period.year}`}
        title={text(language, { ms: "Analisis seluruh tahun", en: "Whole-year analysis" })}
        description={period.examName}
        icon={BarChart3}
        actions={<a href={`${assessmentApiBasePath(period)}/reports/years/pdf`} className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary-700 bg-primary-700 px-3.5 py-2 text-sm font-semibold text-white shadow-raised transition-colors hover:bg-primary-800">{text(language, { ms: "Muat turun PDF", en: "Download PDF" })}</a>}
      />

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {[...grouped.entries()].map(([level, levelClasses]) => {
          const analysis = calculateUpsaYearAnalysis(level, levelClasses);
          return (
            <a key={level} href={assessmentYearPath(period, level)} className="group">
              <Card hover className="h-full">
                <CardContent className="p-5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary-600"><BarChart3 className="h-[18px] w-[18px]" aria-hidden="true" /></span>
                  <h2 className="mt-4 font-display text-lg font-semibold text-text-primary">{text(language, { ms: "Tahun", en: "Year" })} {level}</h2>
                  <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                    <div><p className="text-text-muted">{text(language, { ms: "Kelas", en: "Classes" })}</p><p className="mt-1 font-semibold tabular-nums text-text-primary">{analysis.classCount}</p></div>
                    <div><p className="text-text-muted">{text(language, { ms: "Murid", en: "Pupils" })}</p><p className="mt-1 font-semibold tabular-nums text-text-primary">{analysis.pupilCount}</p></div>
                    <div><p className="text-text-muted">{text(language, { ms: "Intervensi", en: "Intervention" })}</p><p className="mt-1 font-semibold tabular-nums text-text-primary">{analysis.interventionPupils.length}</p></div>
                  </div>
                </CardContent>
              </Card>
            </a>
          );
        })}
      </div>
    </AppShell>
  );
}
