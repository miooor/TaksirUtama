import { renderToBuffer } from "@react-pdf/renderer";
import { getAssessmentApiContext, reportAssessmentName } from "@/lib/assessmentApi";
import { buildUpsaYearSummaryReport } from "@/lib/pdf/reportData";
import { getAllAssessmentClassResultsWithRegistry } from "@/lib/upsa/data";
import { SkspsUpsaYearSummaryReportTemplate } from "@/pdf/templates/SkspsUpsaYearSummaryReportTemplate";
import { schoolReportFilename } from "@/lib/reportFilename";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ year: string; assessment: string; level: string }> },
) {
  const { level } = await params;
  const { context, school, period } = await getAssessmentApiContext(params);
  const results = await getAllAssessmentClassResultsWithRegistry(context, period);
  const report = buildUpsaYearSummaryReport(period, results, level);
  const buffer = await renderToBuffer(SkspsUpsaYearSummaryReportTemplate({ report, school }));

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${schoolReportFilename(school, `TAHUN ${level} - RINGKASAN ${reportAssessmentName(period)}.pdf`)}"`,
    },
  });
}
