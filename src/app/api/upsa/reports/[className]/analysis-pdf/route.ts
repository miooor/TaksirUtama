import { renderToBuffer } from "@react-pdf/renderer";
import { calculateUpsaClassAnalysis } from "@/lib/upsa/calculateUpsaClassAnalysis";
import { getAssessmentClassResultWithRegistry } from "@/lib/upsa/data";
import { SkspsUpsaAnalysisReportTemplate } from "@/pdf/templates/SkspsUpsaAnalysisReportTemplate";
import { requireDefaultUpsaContext } from "@/lib/defaultDataContext";
import { schoolReportFilename } from "@/lib/reportFilename";

export async function GET(_: Request, { params }: { params: Promise<{ className: string }> }) {
  const { context, school, period } = await requireDefaultUpsaContext();
  const { className } = await params;
  const result = await getAssessmentClassResultWithRegistry(context, period, decodeURIComponent(className));
  const analysis = calculateUpsaClassAnalysis(result);
  const buffer = await renderToBuffer(SkspsUpsaAnalysisReportTemplate({ result, analysis, period, school }));
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${schoolReportFilename(school, `${result.className} - ANALISIS UPSA ${period.year}.pdf`)}"`,
    },
  });
}
