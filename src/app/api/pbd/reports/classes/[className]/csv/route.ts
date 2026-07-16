import { calculatePbdClassAnalysis } from "@/lib/pbd/analysis";
import { getAllPbdRecords } from "@/lib/pbd/data";
import { toCsv } from "@/lib/csv";
import { currentSchoolReportFilename } from "@/lib/reportFilename";
import { requireDefaultPbdContext } from "@/lib/defaultDataContext";

export async function GET(_: Request, { params }: { params: Promise<{ className: string }> }) {
  const { className } = await params;
  const { school, period } = await requireDefaultPbdContext();
  const analysis = calculatePbdClassAnalysis(decodeURIComponent(className), await getAllPbdRecords(school, period));
  const csv = toCsv(analysis.subjectRecords.map((record) => ({
    Subjek: record.subjectCode,
    Dominan: record.dominantTpBand,
    "TP1+TP2 %": record.lowAchievementPercentage.toFixed(1),
    "TP5+TP6 %": record.highAchievementPercentage.toFixed(1),
    "Belum Ditaksir": record.notAssessedCount,
    "Isu Data": record.dataIssues.join("; "),
  })));
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${await currentSchoolReportFilename(`${analysis.className} - LAPORAN PBD.csv`)}"` } });
}
