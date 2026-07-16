import { renderToBuffer } from "@react-pdf/renderer";
import { getAssessmentApiContext, reportAssessmentName } from "@/lib/assessmentApi";
import { getAssessmentClassResult } from "@/lib/upsa/data";
import { SkspsUpsaSlipTemplate } from "@/pdf/templates/SkspsUpsaSlipTemplate";
import { schoolReportFilename } from "@/lib/reportFilename";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ year: string; assessment: string; className: string; studentId: string }> },
) {
  const { className, studentId } = await params;
  const { school, period } = await getAssessmentApiContext(params);
  const result = await getAssessmentClassResult(school, period, decodeURIComponent(className));
  const student = result.students.find((item) => item.id === decodeURIComponent(studentId));
  if (!student) {
    return new Response("Student not found", { status: 404 });
  }
  const buffer = await renderToBuffer(SkspsUpsaSlipTemplate({ student, slipTitle: period.slipTitle, school }));
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${schoolReportFilename(school, `${result.className} - ${student.name} - SLIP ${reportAssessmentName(period)}.pdf`)}"`,
    },
  });
}
