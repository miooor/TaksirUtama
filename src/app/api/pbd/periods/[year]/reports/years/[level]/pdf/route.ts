import { renderToBuffer } from "@react-pdf/renderer";
import { calculatePbdYearAnalysis } from "@/lib/pbd/analysis";
import { getAllPbdRecords } from "@/lib/pbd/data";
import { SkspsPbdYearReportTemplate } from "@/pdf/templates/SkspsPbdYearReportTemplate";
import { getPbdPageContext, pbdSemesterFromRequest } from "@/lib/pbdPages";
import { schoolReportFilename } from "@/lib/reportFilename";

export async function GET(request: Request, { params }: { params: Promise<{ year: string; level: string }> }) {
  const { level } = await params;
  const { school, period } = await getPbdPageContext(params, pbdSemesterFromRequest(request));
  const analysis = calculatePbdYearAnalysis(Number(level), await getAllPbdRecords(school, period));
  const buffer = await renderToBuffer(SkspsPbdYearReportTemplate({ analysis, school }));
  return new Response(new Uint8Array(buffer), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${schoolReportFilename(school, `TAHUN ${analysis.year} - LAPORAN PBD SEMESTER ${period.semester} ${period.year}.pdf`)}"` } });
}
