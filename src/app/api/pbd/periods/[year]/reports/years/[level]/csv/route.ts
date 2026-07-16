import { calculatePbdYearAnalysis } from "@/lib/pbd/analysis";
import { getAllPbdRecords } from "@/lib/pbd/data";
import { toCsv } from "@/lib/csv";
import { calculatePbdReadiness } from "@/lib/pbd/readiness";
import { getPbdPageContext } from "@/lib/pbdPages";
import { schoolReportFilename } from "@/lib/reportFilename";

export async function GET(_: Request, { params }: { params: Promise<{ year: string; level: string }> }) {
  const { level } = await params;
  const { school, period } = await getPbdPageContext(params);
  const analysis = calculatePbdYearAnalysis(Number(level), await getAllPbdRecords(school, period));
  const issueSummary = calculatePbdReadiness(analysis.subjectAnalyses.flatMap((subject) => subject.records)).issueSummary;
  const summarizedIssues = issueSummary.map((item) => `${item.issue} (${item.count})`).join("; ");
  const csv = toCsv(analysis.subjectAnalyses.map((subject) => ({
    Subjek: subject.subjectCode,
    "Jumlah Murid": subject.totalPupils,
    "TP1+TP2 %": (subject.aggregateTpPercentages.TP1 + subject.aggregateTpPercentages.TP2).toFixed(1),
    "TP5+TP6 %": (subject.aggregateTpPercentages.TP5 + subject.aggregateTpPercentages.TP6).toFixed(1),
    "Belum Ditaksir": subject.totalNotAssessed,
    "Isu Data": summarizedIssues,
  })));
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${schoolReportFilename(school, `TAHUN ${analysis.year} - LAPORAN PBD ${period.year}.csv`)}"` } });
}
