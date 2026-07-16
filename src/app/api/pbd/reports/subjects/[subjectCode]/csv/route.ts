import { calculatePbdSubjectAnalysis } from "@/lib/pbd/analysis";
import { getPbdSubjectRecords } from "@/lib/pbd/data";
import { toCsv } from "@/lib/csv";
import { currentSchoolReportFilename } from "@/lib/reportFilename";
import { requireDefaultPbdContext } from "@/lib/defaultDataContext";

export async function GET(_: Request, { params }: { params: Promise<{ subjectCode: string }> }) {
  const { subjectCode } = await params;
  const { school, period } = await requireDefaultPbdContext();
  const analysis = calculatePbdSubjectAnalysis(subjectCode, await getPbdSubjectRecords(school, period, subjectCode));
  const csv = toCsv(analysis.records.map((record) => ({
    Kelas: record.className,
    TP1: record.tpCounts.TP1,
    TP2: record.tpCounts.TP2,
    TP3: record.tpCounts.TP3,
    TP4: record.tpCounts.TP4,
    TP5: record.tpCounts.TP5,
    TP6: record.tpCounts.TP6,
    "TP1+TP2 %": record.lowAchievementPercentage.toFixed(1),
    "TP5+TP6 %": record.highAchievementPercentage.toFixed(1),
    "Belum Ditaksir": record.notAssessedCount,
    "Isu Data": record.dataIssues.join("; "),
  })));
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${await currentSchoolReportFilename(`${analysis.subjectCode} - LAPORAN PBD.csv`)}"` } });
}
