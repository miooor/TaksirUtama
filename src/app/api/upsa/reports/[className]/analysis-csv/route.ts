import { calculateUpsaClassAnalysis } from "@/lib/upsa/calculateUpsaClassAnalysis";
import { getAssessmentClassResultWithRegistry } from "@/lib/upsa/data";
import { requireDefaultUpsaContext } from "@/lib/defaultDataContext";
import { toCsv } from "@/lib/csv";
import { currentSchoolReportFilename } from "@/lib/reportFilename";

export async function GET(_: Request, { params }: { params: Promise<{ className: string }> }) {
  const { className } = await params;
  const { context, school, period } = await requireDefaultUpsaContext();
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
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${await currentSchoolReportFilename(`${analysis.className} - ANALISIS UPSA.csv`)}"` } });
}
