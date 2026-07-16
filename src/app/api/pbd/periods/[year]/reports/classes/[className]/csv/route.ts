import { calculatePbdClassAnalysis } from "@/lib/pbd/analysis";
import { getAllPbdRecords } from "@/lib/pbd/data";
import { toCsv } from "@/lib/csv";
import { getPbdPageContext } from "@/lib/pbdPages";
import { schoolReportFilename } from "@/lib/reportFilename";

export async function GET(_: Request, { params }: { params: Promise<{ year: string; className: string }> }) {
  const { className } = await params;
  const { school, period } = await getPbdPageContext(params);
  const analysis = calculatePbdClassAnalysis(decodeURIComponent(className), await getAllPbdRecords(school, period));
  const csv = toCsv(analysis.subjectRecords.map((record) => ({
    Subjek: record.subjectCode,
    Dominan: record.dominantTpBand,
    "TP1+TP2 %": record.lowAchievementPercentage.toFixed(1),
    "TP5+TP6 %": record.highAchievementPercentage.toFixed(1),
    "Belum Ditaksir": record.notAssessedCount,
    "Isu Data": record.dataIssues.join("; "),
  })));
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${schoolReportFilename(school, `${analysis.className} - LAPORAN PBD ${period.year}.csv`)}"` } });
}
