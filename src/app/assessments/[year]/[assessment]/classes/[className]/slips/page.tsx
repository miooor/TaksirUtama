import { AppShell } from "@/components/shared/AppShell";
import { ExportMeta } from "@/components/shared/ExportMeta";
import { UpsaSlipPreview } from "@/components/upsa/UpsaSlipPreview";
import { getAssessmentClassResultHybrid } from "@/lib/upsa/data";
import { assessmentApiBasePath, getAssessmentActorPageContext } from "@/lib/assessmentPages";

export default async function AssessmentSlipsPage({
  params,
}: {
  params: Promise<{ year: string; assessment: string; className: string }>;
}) {
  const { className } = await params;
  const { context, school, period } = await getAssessmentActorPageContext(params);
  const result = await getAssessmentClassResultHybrid(context, period, decodeURIComponent(className));
  return (
    <AppShell>
      <div className="flex flex-col gap-4 border-b border-border-default pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary-600">Pratonton slip</p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-text-primary">{result.className}</h1>
          <p className="mt-1 text-sm text-text-muted">{period.examName}</p>
        </div>
        <a href={`${assessmentApiBasePath(period)}/slips/${encodeURIComponent(result.className)}/pdf`} className="inline-flex items-center justify-center gap-2 self-start rounded-lg border border-primary-700 bg-primary-700 px-3.5 py-2 text-sm font-semibold text-white shadow-raised transition-colors hover:bg-primary-800 md:self-auto">
          Muat turun semua slip
        </a>
      </div>
      <div className="mt-6"><ExportMeta /></div>
      <div className="mt-6 space-y-6">
        {result.students.map((student) => <UpsaSlipPreview key={student.id} student={student} slipTitle={period.slipTitle} school={school} />)}
      </div>
    </AppShell>
  );
}
