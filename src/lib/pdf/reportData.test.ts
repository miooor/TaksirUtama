import { describe, expect, it } from "vitest";
import { buildPbdTpSegments, buildUpsaReportSubjectRows, buildUpsaYearSummaryReport } from "@/lib/pdf/reportData";
import type { AssessmentPeriod } from "@/lib/config/periods";
import type { UpsaClassAnalysis, UpsaClassResult } from "@/types/upsa";

describe("PDF report data helpers", () => {
  it("builds PBD TP segments with count labels for every band", () => {
    const segments = buildPbdTpSegments({ TP1: 1, TP2: 2, TP3: 7, TP4: 10, TP5: 0, TP6: 0 });

    expect(segments.map((segment) => segment.label)).toEqual(["TP1 1", "TP2 2", "TP3 7", "TP4 10", "TP5 0", "TP6 0"]);
    expect(segments.find((segment) => segment.band === "TP1")).toMatchObject({ count: 1, showInside: false });
    expect(segments.find((segment) => segment.band === "TP4")).toMatchObject({ count: 10, showInside: true });
  });

  it("keeps UPSA exclusive-choice subjects separate in report rows", () => {
    const rows = buildUpsaReportSubjectRows([
      subject("BA", 10, 8, 2, 70, { A: 3, B: 5, F: 2 }),
      subject("BTSK", 5, 3, 2, 50, { C: 3, F: 2 }),
      subject("BCSK", 2, 2, 0, 80, { A: 2 }),
      subject("BA/BTSK/BCSK", 17, 0, 0, null, {}),
      subject("PAI", 12, 10, 2, 65, { A: 5, C: 5, F: 2 }),
      subject("MORAL", 4, 4, 0, 75, { A: 4 }),
      subject("PAI/MORAL", 16, 0, 0, null, {}),
      subject("BM", 20, 18, 2, 60, { B: 10, C: 8, F: 2 }),
    ]);

    expect(rows.map((row) => row.subjectCode)).toEqual(expect.arrayContaining(["BA", "BTSK", "BCSK", "PAI", "MORAL", "BM"]));
    expect(rows.some((row) => row.subjectCode === "BA/BTSK/BCSK")).toBe(false);
    expect(rows.some((row) => row.subjectCode === "PAI/MORAL")).toBe(false);
    expect(rows.find((row) => row.subjectCode === "BA")).toMatchObject({ enteredCount: 10, passCount: 8, failCount: 2 });
    expect(rows.find((row) => row.subjectCode === "MORAL")).toMatchObject({ enteredCount: 4, passCount: 4, failCount: 0 });
  });

  it("builds UPSA year summaries with all matching classes", () => {
    const report = buildUpsaYearSummaryReport(period, [
      classResult("2 Angsana", 60),
      classResult("2 Bakawali", 70),
      classResult("3 Angsana", 80),
    ]);

    expect(report.levels.map((level) => level.level)).toEqual(["2", "3"]);
    expect(report.overall.classCount).toBe(3);
    expect(report.levels.find((level) => level.level === "2")?.analysis.classCount).toBe(2);
  });
});

function subject(
  subjectCode: string,
  enteredCount: number,
  passCount: number,
  failCount: number,
  average: number | null,
  gradeDistribution: Record<string, number>,
): UpsaClassAnalysis["subjectAnalyses"][number] {
  return {
    subjectCode,
    enteredCount,
    missingCount: 0,
    absentCount: 0,
    average,
    highestMark: average,
    lowestMark: average,
    passCount,
    failCount,
    passPercentage: enteredCount ? (passCount / enteredCount) * 100 : null,
    gradeDistribution,
  };
}

const period: AssessmentPeriod = {
  year: "2026",
  assessment: "upsa",
  spreadsheetId: "sheet",
  examName: "UPSA 2026",
  slipTitle: "UPSA 2026",
  enabled: true,
  default: true,
};

function classResult(className: string, mark: number): UpsaClassResult {
  return {
    className,
    teacherName: "Teacher",
    students: [{
      id: className,
      bil: "1",
      name: "Pupil",
      className,
      teacherName: "Teacher",
      subjects: [{ subjectCode: "BM", subjectName: "BM", mark, maxMark: 100, grade: mark >= 80 ? "A" : "C", status: "marked" }],
      average: mark,
      totalMarks: mark,
      validSubjectCount: 1,
      missingSubjects: [],
      absentSubjects: [],
      studentId: null,
      enrollmentId: null,
      matchStatus: "unmatched" as const,
    }],
  };
}
