import { renderToBuffer } from "@react-pdf/renderer";
import { calculatePbdYearAnalysis } from "@/lib/pbd/analysis";
import { getAllPbdRecords } from "@/lib/pbd/data";
import { SkspsPbdYearReportTemplate } from "@/pdf/templates/SkspsPbdYearReportTemplate";
import { currentSchoolReportFilename } from "@/lib/reportFilename";
import { requireDefaultPbdContext } from "@/lib/defaultDataContext";

export async function GET(_: Request, { params }: { params: Promise<{ year: string }> }) {
  const { school, period } = await requireDefaultPbdContext();
  const { year } = await params;
  const analysis = calculatePbdYearAnalysis(Number(year), await getAllPbdRecords(school, period));
  const buffer = await renderToBuffer(SkspsPbdYearReportTemplate({ analysis, school }));
  return new Response(new Uint8Array(buffer), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${await currentSchoolReportFilename(`TAHUN ${analysis.year} - LAPORAN PBD.pdf`)}"` } });
}
