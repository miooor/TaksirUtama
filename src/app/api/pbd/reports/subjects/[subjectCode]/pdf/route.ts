import { renderToBuffer } from "@react-pdf/renderer";
import { calculatePbdSubjectAnalysis } from "@/lib/pbd/analysis";
import { getPbdSubjectRecords } from "@/lib/pbd/data";
import { SkspsPbdSubjectReportTemplate } from "@/pdf/templates/SkspsPbdSubjectReportTemplate";
import { currentSchoolReportFilename } from "@/lib/reportFilename";
import { requireDefaultPbdContext } from "@/lib/defaultDataContext";

export async function GET(_: Request, { params }: { params: Promise<{ subjectCode: string }> }) {
  const { school, period } = await requireDefaultPbdContext();
  const { subjectCode } = await params;
  const analysis = calculatePbdSubjectAnalysis(subjectCode, await getPbdSubjectRecords(school, period, subjectCode));
  const buffer = await renderToBuffer(SkspsPbdSubjectReportTemplate({ analysis, school }));
  return new Response(new Uint8Array(buffer), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${await currentSchoolReportFilename(`${analysis.subjectCode} - LAPORAN PBD.pdf`)}"` } });
}
