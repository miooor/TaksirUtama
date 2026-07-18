import { renderToBuffer } from "@react-pdf/renderer";
import { calculatePbdSubjectAnalysis } from "@/lib/pbd/analysis";
import { getPbdSubjectRecords } from "@/lib/pbd/data";
import { SkspsPbdSubjectReportTemplate } from "@/pdf/templates/SkspsPbdSubjectReportTemplate";
import { getPbdPageContext, pbdSemesterFromRequest } from "@/lib/pbdPages";
import { schoolReportFilename } from "@/lib/reportFilename";

export async function GET(request: Request, { params }: { params: Promise<{ year: string; subjectCode: string }> }) {
  const { subjectCode } = await params;
  const { school, period } = await getPbdPageContext(params, pbdSemesterFromRequest(request));
  const analysis = calculatePbdSubjectAnalysis(subjectCode, await getPbdSubjectRecords(school, period, subjectCode));
  const buffer = await renderToBuffer(SkspsPbdSubjectReportTemplate({ analysis, school }));
  return new Response(new Uint8Array(buffer), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${schoolReportFilename(school, `${analysis.subjectCode} - LAPORAN PBD SEMESTER ${period.semester} ${period.year}.pdf`)}"` } });
}
