import { getAssessmentApiContext, reportAssessmentName } from "@/lib/assessmentApi";
import { schoolReportFilename } from "@/lib/reportFilename";
import { toCsv } from "@/lib/csv";
import { calculateUpsaClassAnalysis } from "@/lib/upsa/calculateUpsaClassAnalysis";
import { getAssessmentClassResultWithRegistry } from "@/lib/upsa/data";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ year: string; assessment: string; className: string }> },
) {
  const { className } = await params;
  const { context, school, period } = await getAssessmentApiContext(params);
  const result = await getAssessmentClassResultWithRegistry(context, period, decodeURIComponent(className));
  const analysis = calculateUpsaClassAnalysis(result);
  const csv = toCsv(analysis.subjectAnalyses.map((subject) => ({
    Subjek: subject.subjectCode,
    Diisi: subject.enteredCount,
    Hilang: subject.missingCount,
    TH: subject.absentCount,
    Purata: subject.average?.toFixed(1) ?? "",
    Tertinggi: subject.highestMark,
    Terendah: subject.lowestMark,
    "Lulus %": subject.passPercentage?.toFixed(1) ?? "",
  })));
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${schoolReportFilename(school, `${analysis.className} - ANALISIS ${reportAssessmentName(period)}.csv`)}"`,
    },
  });
}
