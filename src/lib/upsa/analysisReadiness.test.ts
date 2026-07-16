import { describe, expect, it } from "vitest";
import { calculateUpsaClassAnalysis } from "@/lib/upsa/calculateUpsaClassAnalysis";
import { calculateUpsaCompletionHeatmap, calculateUpsaReadiness } from "@/lib/upsa/readiness";
import { parseUpsaClassSheet } from "@/lib/upsa/parseUpsaClassSheet";

describe("UPSA alternative-language analysis and readiness", () => {
  const result = parseUpsaClassSheet([
    ["BIL", "NAMA", "BM", "GRED", "BI", "GRED", "MATE", "GRED", "SAINS", "GRED", "BA", "GRED", "BTSK", "GRED", "BCSK", "GRED"],
    ["", "", 100, "", 100, "", 100, "", 100, "", 100, "", 100, "", 100, ""],
    [1, "Has BA", 80, "A", 81, "A", 82, "A", 83, "A", 84, "A", "", "", "", ""],
    [2, "No Alternative Language", 80, "A", 81, "A", 82, "A", 83, "A", "", "", "", "", "", ""],
  ], "4 ANGSANA");

  it("does not mark pupils missing or needing intervention for unselected alternatives", () => {
    const analysis = calculateUpsaClassAnalysis(result);

    expect(analysis.pupilsWithMissingMarks).toBe(1);
    expect(analysis.missingMarks).toEqual([
      { studentName: "No Alternative Language", subjects: ["BA/BTSK/BCSK"] },
    ]);
    expect(analysis.interventionPupils).toEqual([]);
  });

  it("keeps actual language marks while collapsing readiness to one required cell", () => {
    const analysis = calculateUpsaClassAnalysis(result);
    const baAnalysis = analysis.subjectAnalyses.find((subject) => subject.subjectCode === "BA");
    const alternativeLanguageAnalysis = analysis.subjectAnalyses.find((subject) => subject.subjectCode === "BA/BTSK/BCSK");
    const readiness = calculateUpsaReadiness([result]);
    const heatmap = calculateUpsaCompletionHeatmap([result]);
    const languageReadiness = readiness.subjectReadiness.find((subject) => subject.subjectCode === "BA/BTSK/BCSK");
    const languageHeatmap = heatmap.rows[0]?.subjects.find((subject) => subject.subjectCode === "BA/BTSK/BCSK");

    expect(baAnalysis).toMatchObject({ enteredCount: 1, missingCount: 0, average: 84 });
    expect(alternativeLanguageAnalysis).toBeUndefined();
    expect(readiness).toMatchObject({ totalCells: 10, enteredCells: 9, missingCells: 1 });
    expect(languageReadiness).toMatchObject({ entered: 1, missing: 1, total: 2 });
    expect(languageHeatmap).toMatchObject({ entered: 1, total: 2, completionPercentage: 50 });
  });

  it("tracks TH separately from missing marks and academic intervention", () => {
    const thResult = parseUpsaClassSheet([
      ["BIL", "NAMA", "BM", "GRED", "BI", "GRED", "MATE", "GRED", "SAINS", "GRED"],
      ["", "", 100, "", 100, "", 100, "", 100, ""],
      [1, "Single TH", "TH", "", 80, "A", 75, "B", 70, "B"],
      [2, "All TH", "TH", "", "th", "", "Tak Hadir", "", "TH", ""],
      [3, "Missing Mark", "", "", 80, "A", 75, "B", 70, "B"],
    ], "4 ANGSANA");
    const analysis = calculateUpsaClassAnalysis(thResult);
    const readiness = calculateUpsaReadiness([thResult]);
    const bmAnalysis = analysis.subjectAnalyses.find((subject) => subject.subjectCode === "BM");

    expect(analysis.missingMarks).toEqual([{ studentName: "Missing Mark", subjects: ["BM"] }]);
    expect(analysis.absentPupils).toEqual([
      { studentName: "Single TH", subjects: ["BM"] },
      { studentName: "All TH", subjects: ["BM", "BI", "MATE", "SAINS"] },
    ]);
    expect(analysis.interventionPupils).toEqual([]);
    expect(bmAnalysis).toMatchObject({ enteredCount: 0, missingCount: 1, absentCount: 2, average: null, passCount: 0, failCount: 0 });
    expect(readiness).toMatchObject({ totalCells: 12, enteredCells: 6, missingCells: 1, absentCells: 5 });
    expect(readiness.completionPercentage).toBeCloseTo((6 / 7) * 100);
  });

  it("treats TH in the alternative-language group as absent, not missing", () => {
    const thLanguageResult = parseUpsaClassSheet([
      ["BIL", "NAMA", "BM", "GRED", "BA", "GRED", "BTSK", "GRED", "BCSK", "GRED"],
      ["", "", 100, "", 100, "", 100, "", 100, ""],
      [1, "Language TH", 80, "A", "TH", "", "", "", "", ""],
    ], "4 ANGSANA");
    const student = thLanguageResult.students[0];
    const readiness = calculateUpsaReadiness([thLanguageResult]);
    const languageReadiness = readiness.subjectReadiness.find((subject) => subject.subjectCode === "BA/BTSK/BCSK");

    expect(student).toMatchObject({
      missingSubjects: [],
      absentSubjects: ["BA/BTSK/BCSK"],
    });
    expect(languageReadiness).toMatchObject({ entered: 0, missing: 0, absent: 1, total: 1, completionPercentage: 100 });
  });

  it("keeps PAI and MORAL analyses separate while collapsing readiness to one required cell", () => {
    const religionMoralResult = parseUpsaClassSheet([
      ["BIL", "NAMA", "BM", "GRED", "PAI", "GRED", "MORAL", "GRED"],
      ["", "", 100, "", 100, "", 100, ""],
      [1, "PAI Pupil", 80, "A", 84, "A", "", ""],
      [2, "Moral Pupil", 80, "A", "", "", 74, "B"],
      [3, "No Religion Moral", 80, "A", "", "", "", ""],
    ], "4 ANGSANA");
    const analysis = calculateUpsaClassAnalysis(religionMoralResult);
    const paiAnalysis = analysis.subjectAnalyses.find((subject) => subject.subjectCode === "PAI");
    const moralAnalysis = analysis.subjectAnalyses.find((subject) => subject.subjectCode === "MORAL");
    const groupedAnalysis = analysis.subjectAnalyses.find((subject) => subject.subjectCode === "PAI/MORAL");
    const readiness = calculateUpsaReadiness([religionMoralResult]);
    const heatmap = calculateUpsaCompletionHeatmap([religionMoralResult]);
    const groupedReadiness = readiness.subjectReadiness.find((subject) => subject.subjectCode === "PAI/MORAL");
    const groupedHeatmap = heatmap.rows[0]?.subjects.find((subject) => subject.subjectCode === "PAI/MORAL");

    expect(analysis.missingMarks).toEqual([{ studentName: "No Religion Moral", subjects: ["PAI/MORAL"] }]);
    expect(paiAnalysis).toMatchObject({ enteredCount: 1, missingCount: 0, average: 84 });
    expect(moralAnalysis).toMatchObject({ enteredCount: 1, missingCount: 0, average: 74 });
    expect(groupedAnalysis).toBeUndefined();
    expect(readiness).toMatchObject({ totalCells: 6, enteredCells: 5, missingCells: 1 });
    expect(groupedReadiness).toMatchObject({ entered: 2, missing: 1, total: 3 });
    expect(groupedHeatmap).toMatchObject({ entered: 2, total: 3, completionPercentage: (2 / 3) * 100 });
  });
});
