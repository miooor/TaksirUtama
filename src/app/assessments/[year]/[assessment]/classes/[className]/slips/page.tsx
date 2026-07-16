import { AppShell } from "@/components/shared/AppShell";
import { ExportMeta } from "@/components/shared/ExportMeta";
import { UpsaSlipPreview } from "@/components/upsa/UpsaSlipPreview";
import { getAssessmentClassResult } from "@/lib/upsa/data";
import { assessmentApiBasePath, getAssessmentPageContext } from "@/lib/assessmentPages";

export default async function AssessmentSlipsPage({
  params,
}: {
  params: Promise<{ year: string; assessment: string; className: string }>;
}) {
  const { className } = await params;
  const { school, period } = await getAssessmentPageContext(params);
  const result = await getAssessmentClassResult(school, period, decodeURIComponent(className));
  return (
    <AppShell>
      <div className="flex flex-col gap-4 border-b pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm text-slate-500">Pratonton slip</p>
          <h1 className="mt-1 text-2xl font-semibold">{result.className}</h1>
          <p className="mt-1 text-sm text-slate-500">{period.examName}</p>
        </div>
        <a href={`${assessmentApiBasePath(period)}/slips/${encodeURIComponent(result.className)}/pdf`} className="action-accent text-sm">
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
