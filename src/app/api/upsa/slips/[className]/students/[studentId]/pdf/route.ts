import { renderToBuffer } from "@react-pdf/renderer";
import { requireDefaultUpsaContext } from "@/lib/defaultDataContext";
import { getAssessmentClassResultWithRegistry } from "@/lib/upsa/data";
import { SkspsUpsaSlipTemplate } from "@/pdf/templates/SkspsUpsaSlipTemplate";
import { schoolReportFilename } from "@/lib/reportFilename";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ className: string; studentId: string }> },
) {
  const { context, school, period } = await requireDefaultUpsaContext();
  const { className, studentId } = await params;
  const result = await getAssessmentClassResultWithRegistry(context, period, decodeURIComponent(className));
  const student = result.students.find((item) => item.id === decodeURIComponent(studentId));
  if (!student) {
    return new Response("Student not found", { status: 404 });
  }
  const buffer = await renderToBuffer(SkspsUpsaSlipTemplate({ student, slipTitle: period.slipTitle, school }));
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${schoolReportFilename(school, `${result.className} - ${student.name} - SLIP UPSA ${period.year}.pdf`)}"`,
    },
  });
}
