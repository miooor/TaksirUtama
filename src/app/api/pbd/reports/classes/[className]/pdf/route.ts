import { renderToBuffer } from "@react-pdf/renderer";
import { calculatePbdClassAnalysis } from "@/lib/pbd/analysis";
import { getAllPbdRecords } from "@/lib/pbd/data";
import { SkspsPbdClassReportTemplate } from "@/pdf/templates/SkspsPbdClassReportTemplate";
import { currentSchoolReportFilename } from "@/lib/reportFilename";
import { requireDefaultPbdContext } from "@/lib/defaultDataContext";

export async function GET(_: Request, { params }: { params: Promise<{ className: string }> }) {
  const { school, period } = await requireDefaultPbdContext();
  const { className } = await params;
  const analysis = calculatePbdClassAnalysis(decodeURIComponent(className), await getAllPbdRecords(school, period));
  const buffer = await renderToBuffer(SkspsPbdClassReportTemplate({ analysis, school }));
  return new Response(new Uint8Array(buffer), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${await currentSchoolReportFilename(`${analysis.className} - LAPORAN PBD.pdf`)}"` } });
}
