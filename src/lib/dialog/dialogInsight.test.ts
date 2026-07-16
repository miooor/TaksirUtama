import { describe, expect, it } from "vitest";
import { buildDialogInsightBriefs, buildDialogInsightOverview, selectDialogInsightBrief } from "@/lib/dialog/insightBrief";
import { classifyDialogInsightFindings } from "@/lib/dialog/insightCategory";
import { generateDialogQuestions } from "@/lib/dialog/questionGenerator";
import type { DialogInsightBrief, DialogInsightClassRow } from "@/types/dialog";
import type { PbdSubjectClassRecord } from "@/types/pbd";
import type { UpsaClassResult, UpsaSubjectResult } from "@/types/upsa";

describe("dialog insight helpers", () => {
  it("labels academic risk, low PBD mastery, and evidence gap findings", () => {
    const findings = classifyDialogInsightFindings(metrics(), [classRow()], "Lengkap");

    expect(findings.map((finding) => finding.category)).toEqual([
      "Risiko akademik",
      "Penguasaan rendah PBD",
      "Jurang evidens UPSA/PBD",
    ]);
  });

  it("generates meeting questions from evidence and repeated-risk pupils", () => {
    const brief = {
      subjectCode: "BM",
      metrics: { ...metrics(), repeatedRiskPupils: 2 },
      findings: classifyDialogInsightFindings(metrics(), [classRow()], "Lengkap"),
      classRows: [classRow()],
    };

    const questions = generateDialogQuestions(brief);

    expect(questions.some((question) => question.prompt.includes("5 Angsana"))).toBe(true);
    expect(questions.some((question) => question.prompt.includes("2 murid risiko berulang"))).toBe(true);
  });

  it("builds subject briefs with PBD subject aliases and defaults to strongest attention", () => {
    const briefs = buildDialogInsightBriefs({
      upsaResults: [upsaClass("5 Angsana", "PAI", [20, 30, 80])],
      pbdRecords: [pbdRecord("P.ISLAM", "5 Angsana", [4, 3, 2, 1, 0, 0])],
      interventions: [],
    });
    const selected = selectDialogInsightBrief(briefs);

    expect(selected).toMatchObject({
      subjectCode: "PAI",
      pbdSubjectCode: "P.ISLAM",
      attentionLevel: "Tinggi",
    });
    expect(selected?.classRows[0]?.className).toBe("5 Angsana");
  });

  it("builds an overview with all matched subjects, all classes, and chart points", () => {
    const briefs = buildDialogInsightBriefs({
      upsaResults: [
        upsaClass("5 Angsana", "BM", [30, 50, 80]),
        upsaClass("5 Bakawali", "BM", [70, 75, 90]),
        upsaClass("5 Angsana", "MATE", [25, 35, 45]),
        upsaClass("5 Bakawali", "MATE", [80, 85, 90]),
      ],
      pbdRecords: [
        pbdRecord("BM", "5 Angsana", [3, 2, 2, 1, 1, 1]),
        pbdRecord("BM", "5 Bakawali", [0, 1, 3, 3, 2, 1]),
        pbdRecord("MATE", "5 Angsana", [4, 3, 2, 1, 0, 0]),
        pbdRecord("MATE", "5 Bakawali", [0, 0, 2, 3, 3, 2]),
      ],
      interventions: [],
    });
    const overview = buildDialogInsightOverview(briefs);

    expect(overview.subjectSummaries.map((summary) => summary.subjectCode).sort()).toEqual(["BM", "MATE"]);
    expect(overview.classSummaries.map((summary) => summary.className).sort()).toEqual(["5 Angsana", "5 Bakawali"]);
    expect(overview.subjectAlignmentPoints).toHaveLength(2);
    expect(overview.subjectRiskPoints[0]).toEqual(expect.objectContaining({
      label: expect.any(String),
      x: expect.any(Number),
      y: expect.any(Number),
      risk: expect.any(Number),
    }));
  });

  it("keeps elective subjects individual without duplicate PBD aliases or readiness groups", () => {
    const upsaResults = [
      upsaClass("4 Angsana", "BA", [80]),
      upsaClass("4 Angsana", "BTSK", [70]),
      upsaClass("4 Angsana", "BCSK", [60]),
      upsaClass("4 Angsana", "PAI", [75]),
      upsaClass("4 Angsana", "MORAL", [65]),
    ];
    const pbdRecords = [
      pbdRecord("B.ARAB", "4 Angsana", [0, 0, 1, 2, 1, 0]),
      pbdRecord("B.TAMIL", "4 Angsana", [0, 0, 1, 2, 1, 0]),
      pbdRecord("B.CHINA", "4 Angsana", [0, 0, 1, 2, 1, 0]),
      pbdRecord("P.ISLAM", "4 Angsana", [0, 0, 1, 2, 1, 0]),
      pbdRecord("P.MORAL", "4 Angsana", [0, 0, 1, 2, 1, 0]),
    ];

    const briefs = buildDialogInsightBriefs({ upsaResults, pbdRecords });

    expect(briefs.map((brief) => brief.subjectCode).sort()).toEqual(["BA", "BCSK", "BTSK", "MORAL", "PAI"]);
    expect(briefs.map((brief) => brief.pbdSubjectCode).sort()).toEqual(["B.ARAB", "B.CHINA", "B.TAMIL", "P.ISLAM", "P.MORAL"]);
    expect(briefs.some((brief) => ["BA/BTSK/BCSK", "PAI/MORAL"].includes(brief.subjectCode))).toBe(false);
  });

  it("canonicalizes a selected PBD alias to its assessment subject brief", () => {
    const briefs = buildDialogInsightBriefs({
      upsaResults: [upsaClass("4 Angsana", "BCSK", [80])],
      pbdRecords: [pbdRecord("B.CHINA", "4 Angsana", [0, 0, 1, 2, 1, 0])],
      selectedSubject: "B.CHINA",
    });

    expect(briefs).toHaveLength(1);
    expect(briefs[0]).toMatchObject({ subjectCode: "BCSK", pbdSubjectCode: "B.CHINA" });
  });

  it("treats Year 1 to 3 as PBD-only evidence without UPSA penalty", () => {
    const briefs = buildDialogInsightBriefs({
      upsaResults: [upsaClass("2 Angsana", "BM", [10, 20, 30])],
      pbdRecords: [pbdRecord("BM", "2 Angsana", [1, 1, 4, 8, 5, 1])],
      interventions: [],
      selectedYear: 2,
    });
    const overview = buildDialogInsightOverview(briefs);
    const brief = selectDialogInsightBrief(briefs, "BM");
    const classSummary = overview.classSummaries[0]!;

    expect(brief?.metrics.upsaApplicable).toBe(false);
    expect(brief?.metrics.upsaAverage).toBeNull();
    expect(brief?.metrics.upsaPassPercentage).toBeNull();
    expect(brief?.classRows[0]).toMatchObject({
      upsaApplicable: false,
      upsaAverage: null,
      upsaPassPercentage: null,
      upsaEnteredCount: 0,
    });
    expect(classSummary.upsaApplicable).toBe(false);
    expect(classSummary.upsaAverage).toBeNull();
    expect(classSummary.upsaPassPercentage).toBeNull();
    expect(classSummary.attentionScore).toBeLessThan(45);
  });

  it("keeps Year 4 to 6 UPSA and PBD combined evidence", () => {
    const briefs = buildDialogInsightBriefs({
      upsaResults: [upsaClass("4 Angsana", "BM", [20, 60, 80])],
      pbdRecords: [pbdRecord("BM", "4 Angsana", [2, 2, 4, 4, 2, 1])],
      interventions: [],
      selectedYear: 4,
    });
    const brief = selectDialogInsightBrief(briefs, "BM");

    expect(brief?.metrics.upsaApplicable).toBe(true);
    expect(brief?.metrics.upsaAverage).not.toBeNull();
    expect(brief?.metrics.upsaPassPercentage).not.toBeNull();
    expect(brief?.classRows[0]?.upsaApplicable).toBe(true);
  });
});

function metrics(): DialogInsightBrief["metrics"] {
  return {
    upsaAverage: 48,
    upsaPassPercentage: 60,
    upsaFailCount: 4,
    upsaEnteredCount: 10,
    pbdLowCount: 4,
    pbdLowPercentage: 40,
    pbdHighCount: 1,
    pbdHighPercentage: 10,
    pbdTotalPupils: 10,
    pbdNotAssessedCount: 0,
    repeatedRiskPupils: 0,
    upsaApplicable: true,
  };
}

function classRow(): DialogInsightClassRow {
  return {
    className: "5 Angsana",
    year: 5,
    upsaApplicable: true,
    upsaAverage: 48,
    upsaPassPercentage: 60,
    upsaFailCount: 4,
    upsaEnteredCount: 10,
    pbdLowCount: 4,
    pbdLowPercentage: 40,
    pbdHighCount: 1,
    pbdHighPercentage: 10,
    pbdTotalPupils: 10,
    pbdNotAssessedCount: 0,
    interventionCount: 0,
    attentionScore: 80,
  };
}

function upsaClass(className: string, subjectCode: string, marks: number[]): UpsaClassResult {
  return {
    className,
    teacherName: "Teacher",
    students: marks.map((mark, index) => ({
      id: String(index + 1),
      bil: String(index + 1),
      name: `Pupil ${index + 1}`,
      className,
      teacherName: "Teacher",
      subjects: [subject(subjectCode, mark)],
      average: mark,
      totalMarks: mark,
      validSubjectCount: 1,
      missingSubjects: [],
      absentSubjects: [],
    })),
  };
}

function subject(subjectCode: string, mark: number): UpsaSubjectResult {
  return {
    subjectCode,
    subjectName: subjectCode,
    mark,
    maxMark: 100,
    grade: mark >= 35 ? "C" : "F",
    status: "marked",
  };
}

function pbdRecord(subjectCode: string, className: string, tp: [number, number, number, number, number, number]): PbdSubjectClassRecord {
  const total = tp.reduce((sum, value) => sum + value, 0);
  return {
    subjectCode,
    subjectName: subjectCode,
    className,
    year: Number(className[0]),
    tpCounts: { TP1: tp[0], TP2: tp[1], TP3: tp[2], TP4: tp[3], TP5: tp[4], TP6: tp[5] },
    tpPercentages: {
      TP1: (tp[0] / total) * 100,
      TP2: (tp[1] / total) * 100,
      TP3: (tp[2] / total) * 100,
      TP4: (tp[3] / total) * 100,
      TP5: (tp[4] / total) * 100,
      TP6: (tp[5] / total) * 100,
    },
    totalPupils: total,
    notAssessedCount: 0,
    lowAchievementCount: tp[0] + tp[1],
    lowAchievementPercentage: ((tp[0] + tp[1]) / total) * 100,
    highAchievementCount: tp[4] + tp[5],
    highAchievementPercentage: ((tp[4] + tp[5]) / total) * 100,
    dominantTpBand: "TP1",
    dataIssues: [],
  };
}
