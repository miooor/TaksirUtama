import { renderToBuffer } from "@react-pdf/renderer";
import { calculatePbdClassAnalysis } from "@/lib/pbd/analysis";
import { getAllPbdRecords } from "@/lib/pbd/data";
import { SkspsPbdClassReportTemplate } from "@/pdf/templates/SkspsPbdClassReportTemplate";
import { getPbdPageContext, pbdSemesterFromRequest } from "@/lib/pbdPages";
import { schoolReportFilename } from "@/lib/reportFilename";

export async function GET(request: Request, { params }: { params: Promise<{ year: string; className: string }> }) {
  const { className } = await params;
  const { school, period } = await getPbdPageContext(params, pbdSemesterFromRequest(request));
  const analysis = calculatePbdClassAnalysis(decodeURIComponent(className), await getAllPbdRecords(school, period));
  const buffer = await renderToBuffer(SkspsPbdClassReportTemplate({ analysis, school }));
  return new Response(new Uint8Array(buffer), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${schoolReportFilename(school, `${analysis.className} - LAPORAN PBD SEMESTER ${period.semester} ${period.year}.pdf`)}"` } });
}
