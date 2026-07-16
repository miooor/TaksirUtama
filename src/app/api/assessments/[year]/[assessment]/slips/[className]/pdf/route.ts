import { renderToBuffer } from "@react-pdf/renderer";
import { getAssessmentApiContext, reportAssessmentName } from "@/lib/assessmentApi";
import { getAssessmentClassResult } from "@/lib/upsa/data";
import { SkspsUpsaClassSlipTemplate } from "@/pdf/templates/SkspsUpsaSlipTemplate";
import { schoolReportFilename } from "@/lib/reportFilename";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ year: string; assessment: string; className: string }> },
) {
  const { className } = await params;
  const { school, period } = await getAssessmentApiContext(params);
  const result = await getAssessmentClassResult(school, period, decodeURIComponent(className));
  const buffer = await renderToBuffer(SkspsUpsaClassSlipTemplate({ students: result.students, slipTitle: period.slipTitle, school }));
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${schoolReportFilename(school, `${result.className} - SLIP ${reportAssessmentName(period)}.pdf`)}"`,
    },
  });
}
