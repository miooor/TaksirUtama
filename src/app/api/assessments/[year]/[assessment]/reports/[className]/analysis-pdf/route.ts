import { renderToBuffer } from "@react-pdf/renderer";
import { getAssessmentApiContext, reportAssessmentName } from "@/lib/assessmentApi";
import { calculateUpsaClassAnalysis } from "@/lib/upsa/calculateUpsaClassAnalysis";
import { getAssessmentClassResultHybrid } from "@/lib/upsa/data";
import { SkspsUpsaAnalysisReportTemplate } from "@/pdf/templates/SkspsUpsaAnalysisReportTemplate";
import { schoolReportFilename } from "@/lib/reportFilename";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ year: string; assessment: string; className: string }> },
) {
  const { className } = await params;
  const { context, school, period } = await getAssessmentApiContext(params);
  const result = await getAssessmentClassResultHybrid(context, period, decodeURIComponent(className));
  const analysis = calculateUpsaClassAnalysis(result);
  const buffer = await renderToBuffer(SkspsUpsaAnalysisReportTemplate({ result, analysis, period, school }));
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${schoolReportFilename(school, `${result.className} - ANALISIS ${reportAssessmentName(period)}.pdf`)}"`,
    },
  });
}
