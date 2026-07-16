import { demoPbdRecords } from "@/lib/demo/data";
import type { PbdClassAnalysis, PbdSubjectAnalysis, PbdSubjectClassRecord, PbdYearAnalysis, TpBand } from "@/types/pbd";

const bands: TpBand[] = ["TP1", "TP2", "TP3", "TP4", "TP5", "TP6"];

function makeRecord(input: (typeof demoPbdRecords)[number]): PbdSubjectClassRecord {
  const tpCounts = Object.fromEntries(bands.map((band, index) => [band, input.tp[index] ?? 0])) as Record<TpBand, number>;
  const tpPercentages = Object.fromEntries(
    bands.map((band) => [band, input.total ? (tpCounts[band] / input.total) * 100 : 0]),
  ) as Record<TpBand, number>;
  const dominantTpBand = bands.reduce<TpBand | null>(
    (winner, band) => (!winner || tpCounts[band] > tpCounts[winner] ? band : winner),
    null,
  );
  const lowAchievementCount = tpCounts.TP1 + tpCounts.TP2;
  const highAchievementCount = tpCounts.TP5 + tpCounts.TP6;

  return {
    subjectCode: input.subjectCode,
    subjectName: input.subjectName,
    className: input.className,
    year: Number(input.className[0]),
    tpCounts,
    tpPercentages,
    totalPupils: input.total,
    notAssessedCount: input.notAssessed,
    lowAchievementCount,
    lowAchievementPercentage: input.total ? (lowAchievementCount / input.total) * 100 : 0,
    highAchievementCount,
    highAchievementPercentage: input.total ? (highAchievementCount / input.total) * 100 : 0,
    dominantTpBand,
    dataIssues: input.notAssessed > 0 ? ["Murid belum ditaksir"] : [],
  };
}

export function getDemoPbdRecords() {
  return demoPbdRecords.map(makeRecord);
}

export function calculatePbdSubjectAnalysis(subjectCode: string, records = getDemoPbdRecords()): PbdSubjectAnalysis {
  const filtered = records.filter((record) => record.subjectCode === subjectCode);
  const aggregateTpCounts = Object.fromEntries(
    bands.map((band) => [band, filtered.reduce((sum, record) => sum + record.tpCounts[band], 0)]),
  ) as Record<TpBand, number>;
  const totalPupils = filtered.reduce((sum, record) => sum + record.totalPupils, 0);
  return {
    subjectCode,
    subjectName: filtered[0]?.subjectName ?? subjectCode,
    records: filtered,
    totalPupils,
    totalNotAssessed: filtered.reduce((sum, record) => sum + record.notAssessedCount, 0),
    aggregateTpCounts,
    aggregateTpPercentages: Object.fromEntries(
      bands.map((band) => [band, totalPupils ? (aggregateTpCounts[band] / totalPupils) * 100 : 0]),
    ) as Record<TpBand, number>,
    lowAchievementClasses: filtered.filter((record) => record.lowAchievementPercentage >= 20),
    highAchievementClasses: filtered.filter((record) => record.highAchievementPercentage >= 20),
    dataIssues: filtered.flatMap((record) => record.dataIssues),
  };
}

export function calculatePbdClassAnalysis(className: string, records = getDemoPbdRecords()): PbdClassAnalysis {
  const subjectRecords = records.filter((record) => record.className === className);
  return {
    className,
    year: Number(className[0]),
    subjectRecords,
    totalSubjects: subjectRecords.length,
    subjectsWithLowAchievement: subjectRecords.filter((record) => record.lowAchievementPercentage >= 20),
    subjectsWithNotAssessed: subjectRecords.filter((record) => record.notAssessedCount > 0),
    dataIssues: subjectRecords.flatMap((record) => record.dataIssues),
  };
}

export function calculatePbdYearAnalysis(year: number, records = getDemoPbdRecords()): PbdYearAnalysis {
  const yearRecords = records.filter((record) => record.year === year);
  const subjectCodes = [...new Set(yearRecords.map((record) => record.subjectCode))];
  const subjectAnalyses = subjectCodes.map((subjectCode) => calculatePbdSubjectAnalysis(subjectCode, yearRecords));
  const classNames = [...new Set(yearRecords.map((record) => record.className))];
  const classComparisons = classNames.map((className) => {
    const classRecords = yearRecords.filter((record) => record.className === className);
    return {
      className,
      totalSubjects: classRecords.length,
      incompleteSubjects: classRecords.filter((record) => record.dataIssues.length > 0).length,
      lowAchievementSubjects: classRecords.filter((record) => record.lowAchievementPercentage >= 20).length,
      highAchievementAverage: classRecords.length
        ? classRecords.reduce((sum, record) => sum + record.highAchievementPercentage, 0) / classRecords.length
        : 0,
    };
  });
  return {
    year,
    classNames,
    subjectAnalyses,
    classComparisons,
    weakestSubjects: [...subjectAnalyses].sort(
      (a, b) =>
        (b.aggregateTpPercentages.TP1 + b.aggregateTpPercentages.TP2) -
        (a.aggregateTpPercentages.TP1 + a.aggregateTpPercentages.TP2),
    ),
    strongestSubjects: [...subjectAnalyses].sort(
      (a, b) =>
        (b.aggregateTpPercentages.TP5 + b.aggregateTpPercentages.TP6) -
        (a.aggregateTpPercentages.TP5 + a.aggregateTpPercentages.TP6),
    ),
    dataIssues: yearRecords.flatMap((record) => record.dataIssues),
  };
}
