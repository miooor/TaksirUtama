import {
  alternativeLanguageMissingCode,
  religionMoralMissingCode,
} from "@/lib/upsa/subjectPolicy";
import { calculateUpsaYearAnalysis } from "@/lib/upsa/calculateUpsaYearAnalysis";
import type { AssessmentPeriod } from "@/lib/config/periods";
import type { TpBand } from "@/types/pbd";
import type { UpsaClassAnalysis, UpsaClassResult, UpsaYearAnalysis } from "@/types/upsa";

export const tpBands: TpBand[] = ["TP1", "TP2", "TP3", "TP4", "TP5", "TP6"];
export const gradeOrder = ["A", "B", "C", "D", "E", "F", "TH"] as const;

export type PbdTpSegment = {
  band: TpBand;
  count: number;
  percentage: number;
  label: string;
  showInside: boolean;
};

type UpsaSubjectAnalysis = UpsaClassAnalysis["subjectAnalyses"][number];

export type UpsaReportSubjectRow = UpsaSubjectAnalysis & {
  sourceSubjectCodes: string[];
  synthetic: boolean;
};

export type UpsaYearLevelSummary = {
  level: string;
  analysis: UpsaYearAnalysis;
};

export type UpsaYearSummaryReport = {
  period: AssessmentPeriod;
  title: string;
  levels: UpsaYearLevelSummary[];
  overall: UpsaYearAnalysis;
};

export function buildPbdTpSegments(counts: Record<TpBand, number>, total = Object.values(counts).reduce((sum, value) => sum + value, 0)): PbdTpSegment[] {
  const safeTotal = Math.max(total, 1);
  return tpBands.map((band) => {
    const count = counts[band];
    const percentage = (count / safeTotal) * 100;
    return {
      band,
      count,
      percentage,
      label: `${band} ${count}`,
      showInside: count > 0 && percentage >= 8,
    };
  });
}

export function buildUpsaReportSubjectRows(analyses: UpsaSubjectAnalysis[]): UpsaReportSubjectRow[] {
  const readinessOnlyCodes = new Set<string>([alternativeLanguageMissingCode, religionMoralMissingCode]);

  return analyses
    .filter((subject) => !readinessOnlyCodes.has(subject.subjectCode))
    .map((subject) => ({ ...subject, sourceSubjectCodes: [subject.subjectCode], synthetic: false }))
    .filter((row) => row.enteredCount > 0 || row.missingCount > 0 || row.absentCount > 0)
    .sort((a, b) => (a.average ?? 0) - (b.average ?? 0) || a.subjectCode.localeCompare(b.subjectCode, "ms"));
}

export function buildUpsaYearSummaryReport(period: AssessmentPeriod, results: UpsaClassResult[], selectedLevel?: string): UpsaYearSummaryReport {
  const filteredResults = selectedLevel ? results.filter((result) => result.className.startsWith(`${selectedLevel} `)) : results;
  const grouped = Map.groupBy(filteredResults, (result) => result.className.split(" ")[0]);
  const levels = [...grouped.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "ms"))
    .map(([level, levelResults]) => ({
      level,
      analysis: calculateUpsaYearAnalysis(level, levelResults),
    }));

  return {
    period,
    title: selectedLevel ? `Tahun ${selectedLevel}` : "Semua Tahun",
    levels,
    overall: calculateUpsaYearAnalysis(selectedLevel ?? "Semua Tahun", filteredResults),
  };
}
